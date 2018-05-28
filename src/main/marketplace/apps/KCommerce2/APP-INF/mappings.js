
// this is for when a product is accessed directly under a store url, ie without a category
var productInStoreMapping = controllerMappings
        .websiteController()
        .enabled(true)
        .isPublic(true)
        .title(function (page) {
            return "TODO";
        })
        // .seoContent('_genDealSeoContent')
        .defaultView(views.templateView('/theme/apps/KCommerce2/viewProduct.html'))
        .pathSegmentResolver('productInStore', 'resolveProduct');


var categoryMapping = controllerMappings
        .websiteController()
        .enabled(true)
        .isPublic(true)
        .title(function (page) {
            return "TODO";
        })
        // .seoContent('_genDealSeoContent')
        //.defaultView(views.templateView('/theme/apps/KCommerce2/viewCategory.html'))
        .addMethod('GET', 'doEcomSearch', 'q')
        .addMethod('GET', 'doSuggestionList', 'suggestions')
        .addMethod('GET', 'doEcomList')

        .pathSegmentResolver('category', 'resolveCategory');

var cartMapping = controllerMappings
        .websiteController()
        .pathSegmentName('cart')
        .enabled(true)
        .isPublic(true)
        .defaultView(views.templateView('/theme/apps/KCommerce2/storeCheckout.html'))
        .postPriviledge('READ_CONTENT')
        .addMethod('POST', 'setCartItem', 'quantity')
        .addMethod('POST', 'removeCartItem', 'removeLineId')
        .addMethod('POST', 'setCartItemQuantity', 'newQuantity')
        .addMethod('POST', 'checkout', 'processCartId');




controllerMappings
        .websiteController()
        .enabled(true)
        .isPublic(true)
        // .mountRepository(g._config.REPO_NAME)
        .pathSegmentResolver('store', 'resolveStoreName')
        .title(function (page) {
            return "TODO";
        })
        // .seoContent('_genDealSeoContent')
        .postPriviledge('READ_CONTENT')
        .child(productInStoreMapping)
        .child(categoryMapping)
        .child(cartMapping)
        .addMethod('GET', 'doEcomSearch', 'q')
        .addMethod('GET', 'doSuggestionList', 'suggestions')
        .addMethod('GET', 'doEcomList')
        .build();

function doSuggestionList(page, params) {
    var query = params.suggestions;
    log.info("doSuggestionList: {}", query);
    var store = page.attributes.store;
    var searchResults = productInCategorySearch(store, page.attributes.category, query); // aggregation to find top cats with matching products
    page.attributes.suggestionList = searchResults; // make available to templates
    return views.templateView("KCommerce2/suggestionList");
}

function doEcomSearch(page, params) {
    var query = params.q;
    if (formatter.isEmpty(query)) {
        return doEcomList(page, params);
    }
    log.info("doEcomSearch: {}", query);
    var store = page.attributes.store;
    var attributePairs = findAttsInParams(params);
    var searchResults = productSearch(store, page.attributes.category, query, attributePairs);
    page.attributes.searchResults = searchResults; // make available to templates
    page.attributes.categories = listCategories(store, page.attributes.category);
    findAttributes(page, store, searchResults);
    return views.templateView("KCommerce2/searchResults");
}

function doEcomList(page, params) {
    log.info("doEcomList:");
    var store = page.attributes.store;
    var attributePairs = findAttsInParams(params);
    var searchResults = productSearch(store, page.attributes.category, null, attributePairs);
    //log.info("searchResults: " + searchResults);
    page.attributes.searchResults = searchResults; // make available to templates
    page.attributes.categories = listCategories(store, page.attributes.category);
    findAttributes(page, store, searchResults);

    if (page.attributes.category) {
        return views.templateView("KCommerce2/viewCategory");
    } else {
        return views.templateView("KCommerce2/viewStore");
    }
}

/**
 * Look for request params with the same name as attribute names,
 * and build a list of their names and values
 * 
 * @param {type} params
 * @returns {undefined}
 */
function findAttsInParams(params) {
    var cm = services.catalogManager;
    var allAttNames = cm.attributeNames();
    var atts = [];
    for( var i=0; i<allAttNames.length; i++) {
        var attName = allAttNames[i].object1;
        var attValue = params.get(attName);
        log.info("findAttsInParams: {} {}", attName, attValue);
        if( !formatter.isEmpty(attValue) ) {
            atts.push({
                "name" : attName,
                "value" : attValue
            });
        }
    }
    return atts;
}

function findAttributes(page, store, searchResults) {
    var minPrice = searchResults.aggregations.asMap.minPrice.value;
    var maxPrice = searchResults.aggregations.asMap.maxPrice.value;
    var attNameBuckets = searchResults.aggregations.asMap.attNames.buckets;
    page.attributes.attributesSummary = findAttributesQuery(store, page.attributes.category, null, minPrice, maxPrice, 5, attNameBuckets);
}

function checkout(page, params, files, form) {
    var processCartId = form.longParam("processCartId");
    var totalAmountFromForm = form.bigDecimalParam("cartTotal");
    var paymentProviderId = form.rawParam("paymentProvider");

    var checkoutItems = services.cartManager.checkoutItems;

    if (checkoutItems == null) {
        return views.jsonView(false, "No cart");
    }
    if (checkoutItems.cartId != processCartId) {
        return views.jsonView(false, "Cart is invalid, please refresh your page");
    }
    if (!checkoutItems.totalCost.equals(totalAmountFromForm)) {
        return views.jsonView(false, "The item prices have changed, please refresh your page");
    }
    var paymentResult;
    transactionManager.runInTransaction(function () {
        var customerGroup = services.cartManager.getOrCreateCustomerGroup("customers"); // todo move to setting
        var purchaser = services.cartManager.getOrCreatePurchaser(form, customerGroup);
        paymentResult = services.cartManager.doProcessCart(form, checkoutItems, purchaser, paymentProviderId);
    });
    if (paymentResult.paymentCompleted) {
        return views.jsonView(true, "Payment completed");
    } else {
        if (paymentResult.nextHref != null) {
            return views.jsonView(true, "Payment pending", paymentResult.nextHref);
        } else {
            return views.jsonView(false, "Payment failed: " + paymentResult.resultMessage);
        }
    }
}

function setCartItemQuantity(page, params, files, form) {
    log.info("setCartItem: form={}", form);
    var newQuantity = form.bigDecimalParam("newQuantity");
    var changeItemId = form.longParam("changeItemId");
    var cart = services.cartManager.shoppingCart(false);
    var item = cart.item(changeItemId);
    item.quantity = newQuantity;
    transactionManager.runInTransaction(function () {
        services.criteriaBuilders.getBuilder("productOrder").save(item);
    });
    return views.jsonView(true, "Updated " + item.productSku.title + " to quantity " + item.quantity);
}

function setCartItem(page, params, files, form) {
    log.info("setCartItem: form={}", form);
    var quantity = form.integerParam("quantity");
    var skuId = form.longParam("skuId");
    var sku = services.criteriaBuilders.get("productSku").eq("id", skuId).executeSingle();
    var store = page.attributes.store;

    var cart = services.cartManager.shoppingCart(true);
    services.cartManager.addOrUpdateItem(cart, sku, quantity, store, true);
    return views.jsonView(true, "Added " + sku.title);
}

function removeCartItem(page, params, files, form) {
    log.info("removeCartItem: form={}", form);
    var lineId = form.integerParam("removeLineId");
    var didRemove;
    transactionManager.runInTransaction(function () {
        didRemove = services.cartManager.removeItem(lineId);
    });

    if (didRemove) {
        return views.jsonView(true, "Removed " + lineId);
    } else {
        return views.jsonView(true, "Didnt find to remove " + lineId);
    }

}

function resolveStoreName(rf, groupName, groupVal) {
    var store = services.criteriaBuilders.get("ecommerceStore")
            .eq("name", groupVal)
            .eq("website", rf.website)
            .executeSingle();
    return store;
}

function resolveProduct(rf, groupName, groupVal, mapOfGroups) {
    var store = mapOfGroups.get("store");
    // First try the webname
    var product = services.criteriaBuilders.get("productInEComStore")
            .join("product", "p")
            .eq("p.webName", groupVal)
            .eq("store", store)
            .executeSingle();

    if (product === null) {
        // Didnt find webname, so try product name
        var product = services.criteriaBuilders.get("productInEComStore")
                .join("product", "p")
                .eq("p.name", groupVal)
                .eq("store", store)
                .executeSingle();
    }

    if (product === null) {
        // Still nuttin, try using the segment as a product ID
        var id = formatter.toLong(groupVal, true);
        if (id !== null) {
            var product = services.criteriaBuilders.get("productInEComStore")
                    .join("product", "p")
                    .eq("p.id", id)
                    .eq("store", store)
                    .executeSingle();
        }
    }
    return product;
}


function resolveCategory(rf, groupName, groupVal, mapOfGroups) {
    // we might want to use this later
    var store = mapOfGroups.get("store");

    var category = services.criteriaBuilders.get("category")
            .eq("name", groupVal)
            .executeSingle();

    return category;
}

