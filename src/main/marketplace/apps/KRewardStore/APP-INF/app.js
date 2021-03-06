function initRewardStoreApp(orgRoot, webRoot, enabled) {
    var rewardStoreApp = applications.rewardStore;
    log.info("initRewardStoreApp: orgRoot={} app={}", orgRoot, rewardStoreApp);
    var alertsApp = applications.alerts;
    if (webRoot) {
        var website = webRoot.website;
        var webName = webRoot.websiteName;
        // check and create the participants group
        var groupName = "participants";
        var group = orgRoot.find("groups").child(groupName);
        if (group == null) {
            group = orgRoot.createGroup("participants");
            orgRoot.addRoles(group, "Redeemer");
            orgRoot.addRoles(group, website, "Content Viewer");
            orgRoot.addGroupToWebsite(group, website);
            log.info("Created participants group '" + groupName + "'");
            if (alertsApp) {
                alertsApp.createAdminAlert("Reward Store", "We've created a group called " + group.name + " for your new reward store. Please be sure to <a href='/groups/" + groupName + "'>check the settings here</a>. You might want to allow public registration to this group.");
            }
        }

        var curUser = securityManager.currentUser;
        securityManager.addToGroup(curUser, group);

        // check and create the points bucket        
        var bucketName = webName + "-points";
        if (rewardStoreApp.checkCreatePointsBucket(bucketName, group.name, webName)) {
            log.info("Created points bucket {}", bucketName);
            if (alertsApp) {
                alertsApp.createAdminAlert("Reward Store", "We've created a points bucket called " + bucketName + " for your new reward store. You can <a href='/points-buckets/" + bucketName + "/'>manage it here</a>");
            }
        }

        // check and create the reward store
        var rewardStoreName = webName + "-store";
        if (rewardStoreApp.checkCreateRewardStore(rewardStoreName, bucketName, webName)) {
            log.info("Created reward store");
            if (alertsApp) {
                alertsApp.createAdminAlert("Reward Store", "We've created a reward store called " + rewardStoreName + ". You can <a href='/reward-store/" + rewardStoreName + "/'>manage it here</a>");
            }
        }

        var productsApp = applications.productsApp;
        if (productsApp) {
            var didAdd = false;
            if (productsApp.checkCreateCategory("elec", "Electronics")) {
                productsApp.checkCreateProduct("p1", "Ipad Mini", "elec");
                rewardStoreApp.addToStore("p1", rewardStoreName);
                productsApp.checkCreateProduct("p2", "Laptop", "elec");
                rewardStoreApp.addToStore("p2", rewardStoreName);
                didAdd = true;
            }
            if (productsApp.checkCreateCategory("home", "Homeware")) {
                productsApp.checkCreateProduct("p3", "Toaster", "home");
                rewardStoreApp.addToStore("p3", rewardStoreName);
                productsApp.checkCreateProduct("p4", "Microwave", "home");
                rewardStoreApp.addToStore("p4", rewardStoreName);
                didAdd = true;
            }
            if (productsApp.checkCreateCategory("exp", "Experiences")) {
                productsApp.checkCreateProduct("p5", "Antarctica", "exp");
                rewardStoreApp.addToStore("p5", rewardStoreName);
                productsApp.checkCreateProduct("p6", "Hawaii", "exp");
                rewardStoreApp.addToStore("p6", rewardStoreName);
                didAdd = true;
            }
            if( didAdd ) {
                alertsApp.createAdminAlert("Reward Store", "We've added some products and categories for you.");
            }
        }
    } else {
        log.info("I'm in an organisation");
    }
}