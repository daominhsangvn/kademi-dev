/**
 * Created by Anh on 7/27/2016.
 */
/**
 * KEditor Carousel Component
 * @copyright: Kademi (http://kademi.co)
 * @author: Kademi (http://kademi.co)
 * @version: @{version}
 * @dependencies: $, $.fn.draggable, $.fn.droppable, $.fn.sortable, Bootstrap, FontAwesome (optional)
 */
(function ($) {
    var KEditor = $.keditor;
    var flog = KEditor.log;
    
    KEditor.components['carousel'] = {
        init: function (contentArea, container, component, keditor) {
            flog('init "carousel" component', component);
            var componentContent = component.children('.keditor-component-content');
            var carousel = componentContent.find('.carousel');
            
            if (carousel.find('.carousel-img').length === 0 && carousel.find('.carousel-content').length === 0) {
                var self = this;
                var images = [];
                
                carousel.addClass('carousel-fixed-height');
                carousel.find('.carousel-inner .item').each(function () {
                    var item = $(this);
                    
                    images.push({
                        src: item.find('img').attr('src'),
                        hash: item.attr('data-hash')
                    });
                });
                
                carousel.attr('data-height', 200).css('height', 200);
                carousel.find('.carousel-inner').html('');
                carousel.find('.carousel-indicators').html('');
                
                $.each(images, function (i, image) {
                    self.addItemToCarousel(component, image.src, image.hash);
                });
            }
            
            var id = keditor.generateId('component-carousel');
            carousel.attr('id', id);
            carousel.find('.carousel-indicators li').attr('data-target', '#' + id);
            carousel.find('.carousel-control').attr('href', '#' + id);
        },
        getContent: function (component, keditor) {
            var componentContent = component.children('.keditor-component-content');
            return componentContent.html();
        },
        settingEnabled: true,
        
        settingTitle: 'Carousel settings',
        
        editingItemId: '',
        
        initSettingForm: function (form, keditor) {
            flog('init "carousel" settings', form);
            
            var self = this;
            return $.ajax({
                url: '/static/keditor/componentCarouselSettings.html',
                type: 'get',
                dataType: 'HTML',
                success: function (resp) {
                    form.html(resp);
                    
                    var basePath = window.location.pathname.substr(0, window.location.pathname.lastIndexOf('/') + 1);
                    var carouselAddImage = form.find('.carouselAddImage');
                    var carouselItemsWrap = form.find('.carouselItemsWrap');
                    
                    carouselAddImage.mselect({
                        contentTypes: ['image'],
                        bs3Modal: true,
                        pagePath: basePath,
                        basePath: basePath,
                        onSelectFile: function (url, relUrl, type, hash) {
                            flog('Keditor carousel selected a file', url, hash);
                            self.addItemToList(form, {
                                src: url,
                                hash: hash
                            });
                            
                            self.refreshCarousel(keditor.getSettingComponent(), form);
                            self.editingItemId = '';
                        }
                    });
                    
                    carouselItemsWrap.sortable({
                        handle: '.btn-sort-item',
                        items: '> .carouselItem',
                        axis: 'y',
                        tolerance: 'pointer',
                        sort: function () {
                            $(this).removeClass('ui-state-default');
                        },
                        update: function () {
                            self.refreshCarousel(keditor.getSettingComponent(), form);
                        }
                    });
                    
                    var contentModal = $(
                        '<div class="modal fade" tabindex="-1" id="modal-carousel-content">' +
                        '    <div class="modal-dialog modal-lg">' +
                        '        <div class="modal-content">' +
                        '            <div class="modal-header">' +
                        '                <button type="button" class="close" data-dismiss="modal">&times;</button>' +
                        '                <h4 class="modal-title">Edit your content</h4>' +
                        '            </div>' +
                        '            <div class="modal-body">' +
                        '                <textarea id="modal-carousel-content-body" class="form-control" rows="12"></textarea>' +
                        '            </div>' +
                        '            <div class="modal-footer">' +
                        '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                        '                <button type="button" class="btn btn-primary btn-carousel-save-content">Save</button>' +
                        '            </div>' +
                        '        </div>' +
                        '    </div>' +
                        '</div>'
                    ).appendTo(document.body);
                    
                    var ckeditorOptions = keditor.options.ckeditorOptions;
                    ckeditorOptions.removePlugins = ckeditorOptions.removePlugins.replace(',autogrow', '');
                    ckeditorOptions.extraPlugins = ckeditorOptions.extraPlugins + ',autogrow';
                    var editor = $('#modal-carousel-content-body').ckeditor(ckeditorOptions).editor;
                    
                    form.find('.carouselAddImage').on('click', function (e) {
                        e.preventDefault();
                    });
                    
                    form.find('.carouselAddContent').on('click', function (e) {
                        e.preventDefault();
                        contentModal.modal('show');
                    });
                    
                    contentModal.on('hidden.bs.modal', function () {
                        editor.setData('');
                        self.editingItemId = '';
                    });
                    
                    contentModal.find('.btn-carousel-save-content').on('click', function (e) {
                        e.preventDefault();
                        
                        flog('Keditor carousel add content');
                        
                        var carouselContent = editor.getData() || '';
                        self.addItemToList(form, {
                            content: carouselContent
                        });
                        
                        self.refreshCarousel(keditor.getSettingComponent(), form);
                        contentModal.modal('hide');
                    });
                    
                    $(document.body).on('click', '.carouselItem a.btn-remove-item', function (e) {
                        e.preventDefault();
                        
                        if (confirm('Are you sure that you want to delete this image?')) {
                            var btn = $(this);
                            var hash = btn.closest('.btn-group').siblings('[data-hash]').attr('data-hash');
                            
                            self.refreshCarousel(keditor.getSettingComponent(), hash);
                            btn.closest('.carouselItem').remove();
                        }
                    });
                    
                    $(document.body).on('click', '.carouselItem a.btn-edit-item', function (e) {
                        e.preventDefault();
                        
                        var carouselItem = $(this).closest('.carouselItem');
                        self.editingItemId = carouselItem.attr('id');
                        
                        if (carouselItem.find('textarea').length > 0) {
                            editor.setData(carouselItem.find('textarea').val() || '');
                            form.find('.carouselAddContent').trigger('click');
                        } else {
                            form.find('.carouselAddImage').trigger('click');
                        }
                    });
                    
                    form.find('.carouselHeight').on('change', function (e) {
                        var value = this.value;
                        
                        if (isNaN(value) || +value < 200) {
                            value = 200;
                            this.value = 200;
                        }
                        
                        var carousel = keditor.getSettingComponent().find('.carousel');
                        carousel.attr('data-height', value);
                        carousel.css('height', value);
                    });
                    
                    form.find('.carouselPause').on('change', function (e) {
                        e.preventDefault();
                        var comp = keditor.getSettingComponent().find('.carousel');
                        comp.attr('data-pause', this.value);
                    });
                    
                    form.find('.carouselInterval').on('change', function (e) {
                        e.preventDefault();
                        var comp = keditor.getSettingComponent().find('.carousel');
                        comp.attr('data-interval', this.value);
                    });
                    
                    form.find('.carouselWrap').on('click', function (e) {
                        var comp = keditor.getSettingComponent().find('.carousel');
                        if (this.checked) {
                            comp.attr('data-wrap', 'true');
                        } else {
                            comp.attr('data-wrap', 'false');
                        }
                    });
                }
            });
        },
        
        showSettingForm: function (form, component, keditor) {
            var self = this;
            self.editingItemId = '';
            form.find('.carouselItemsWrap').html('');
            component.find('.carousel-inner > .item').each(function () {
                var item = $(this);
                var carouselImg = item.find('.carousel-img');
                var carouselContent = item.find('.carousel-content');
                
                if (carouselContent.length > 0) {
                    self.addItemToList(form, {
                        content: carouselContent.html()
                    });
                } else {
                    var url = carouselImg.css('background-image');
                    url = url.slice(4, -1).replace(/['"]/g, '');
                    var hash = $(item).attr('data-hash');
                    
                    self.addItemToList(form, {
                        src: url,
                        hash: hash
                    });
                }
            });
            
            var isWrap = component.find('.carousel').attr('data-wrap');
            var pause = component.find('.carousel').attr('data-pause');
            var interval = component.find('.carousel').attr('data-interval');
            var height = component.find('.carousel').attr('data-height');
            
            form.find('.carouselPause').val(pause);
            form.find('.carouselInterval').val(interval);
            form.find('.carouselWrap').prop('checked', isWrap === 'true');
            form.find('.carouselHeight').val(height);
        },
        
        addItemToCarousel: function (component, data) {
            flog('addItemToCarousel', component, data);
            
            var carousel = component.find('.carousel');
            var id = carousel.attr('id');
            var index = carousel.find('.carousel-indicators').children().length;
            var cls = index === 0 ? 'active' : '';
            var backgroundUrl = "background-image: url('" + data.src + "')";
            
            carousel.find('.carousel-indicators').append(
                '<li data-target="#' + id + '" data-slide-to="' + index + '" class="' + cls + '"></li>'
            );
            
            var itemStr = '';
            if (data.content) {
                itemStr += '<div class="item ' + cls + '">';
                itemStr += '   <div class="carousel-content clearfix">' + data.content + '</div>';
                itemStr += '   <div class="carousel-caption"></div>';
                itemStr += '</div>';
            } else {
                itemStr += '<div data-hash="' + data.hash + '" class="item ' + cls + '">';
                itemStr += '   <div class="carousel-img" style="' + backgroundUrl + '"></div>';
                itemStr += '   <div class="carousel-caption"></div>';
                itemStr += '</div>';
            }
            
            carousel.find('.carousel-inner').append(itemStr);
        },
        
        addItemToList: function (form, data) {
            flog('addItemToList', form, data);
            
            var itemStr = '';
            if (data.content) {
                itemStr += '<img class="img-responsive" src="/static/keditor/componentCarouselContent.png" />';
                itemStr += '<textarea style="display: none">' + data.content + '</textarea>';
            } else {
                itemStr = '<img class="img-responsive" src="' + data.src + '" data-hash="' + data.hash + '" />';
            }
            itemStr += '   <div class="btn-group btn-group-sm">';
            itemStr += '       <a class="btn btn-info btn-sort-item" href="#"><i class="fa fa-sort"></i></a>';
            itemStr += '       <a class="btn btn-success btn-edit-item" href="#"><i class="fa fa-edit"></i></a>';
            itemStr += '       <a title="Delete this image" class="btn btn-danger btn-remove-item" href="#"><i class="fa fa-trash"></i></a>';
            itemStr += '   </div>';
            
            if (this.editingItemId) {
                form.find('#' + this.editingItemId).html(itemStr);
                this.editingItemId = '';
            } else {
                form.find('.carouselItemsWrap').append(
                    '<div class="carouselItem" id="carouselItem-' + (new Date()).getTime() + '">' + itemStr + '</div>'
                );
            }
        },
        
        refreshCarousel: function (component, form) {
            var self = this;
            var carousel = component.find('.carousel');
            carousel.find('.carousel-inner').html('');
            carousel.find('.carousel-indicators').html('');
            
            form.find('.carouselItemsWrap').find('.carouselItem').each(function () {
                var carouselItem = $(this);
                var textarea = carouselItem.find('textarea')
                var img = carouselItem.find('img');
                
                if (textarea.length === 0) {
                    self.addItemToCarousel(component, {
                        src: img.attr('src'),
                        hash: img.attr('data-hash')
                    });
                } else {
                    self.addItemToCarousel(component, {
                        content: textarea.val()
                    });
                }
            });
        }
    }
    
})(jQuery);