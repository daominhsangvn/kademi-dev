(function ($, window) {
    $(function () {
        initViewLeadsPage();
    });
    
    function initViewLeadsPage() {
        initAddTag();
        initTagsInput();
        initLeadActions();
        initCancelLeadModal();
        initCloseDealModal();
        initDateTimePickers();
        initFileNoteEdit();
        initLeadContactForm();
        initUpdateUserModal();
        initLeadOrgForm();
        initOrgSearch();
        initJobTitleSearch();
        initUnlinkCompany();
        
        if (typeof Dropzone === 'undefined') {
            $.getStyleOnce('/static/dropzone/4.3.0/downloads/css/dropzone.css');
            $.getScriptOnce('/static/dropzone/4.3.0/downloads/dropzone.min.js', function () {
                initFileUploads();
            });
        } else {
            initFileUploads();
        }
    }
    
    function initOrgSearch() {
        var orgSearch = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: '/leads?orgSearch=%QUERY',
                wildcard: '%QUERY'
            }
        });
        var orgTitleSearch = $('#orgTitleSearch');
        var form = orgTitleSearch.closest('.form-horizontal');
        var btnSaveCompany = form.find('.btn-save-company');
        
        orgTitleSearch.typeahead({
            highlight: true
        }, {
            display: 'title',
            limit: 10,
            source: orgSearch,
            templates: {
                empty: [
                    '<div class="empty-message">',
                    'No existing companies were found.',
                    '</div>'
                ].join('\n'),
                suggestion: Handlebars.compile(
                    '<div>'
                    + '<strong>{{title}}</strong>'
                    + '</br>'
                    + '<span>{{phone}}</span>'
                    + '</br>'
                    + '<span>{{address}}, {{addressLine2}}, {{addressState}}, {{postcode}}</span>'
                    + '</div>')
            }
        });
        
        var timer;
        orgTitleSearch.bind('typeahead:render', function (ev) {
            clearTimeout(timer);
            timer = setTimeout(function () {
                var ttMenu = orgTitleSearch.siblings('.tt-menu');
                var isSuggestionAvailable = ttMenu.find('.empty-message').length === 0;
                
                flog('typeahead:render Is suggestion available: ' + isSuggestionAvailable, ttMenu.find('.empty-message'));
                
                if (!isSuggestionAvailable) {
                    btnSaveCompany.html('Create new company');
                    form.find('.btn-company-details').css('display', 'none');
                    form.find('input[name=leadOrgId]').val('');
                }
            }, 50);
        });
        
        orgTitleSearch.bind('typeahead:select', function (ev, sug) {
            form.find('input[name=email]').val(sug.email);
            form.find('input[name=phone]').val(sug.phone);
            form.find('input[name=address]').val(sug.address);
            form.find('input[name=addressLine2]').val(sug.addressLine2);
            form.find('input[name=addressState]').val(sug.state);
            form.find('input[name=postcode]').val(sug.postcode);
            form.find('input[name=leadOrgId]').val(sug.orgId);
            form.find('[name=country]').val(sug.country);
            form.find('.btn-company-details').css('display', 'inline').attr('href', '/companies/' + sug.id);
            btnSaveCompany.html('Save details');
        });
        
        orgTitleSearch.on({
            input: function () {
                if (!this.value) {
                    form.find('input[name=email]').val('');
                    form.find('input[name=phone]').val('');
                    form.find('input[name=address]').val('');
                    form.find('input[name=addressLine2]').val('');
                    form.find('input[name=addressState]').val('');
                    form.find('input[name=postcode]').val('');
                    form.find('input[name=leadOrgId]').val('');
                    form.find('[name=country]').val('');
                }
            }
        });
    }
    
    function initJobTitleSearch() {
        var jobTitleSearch = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: window.location.pathname + '?jobTitle&q=%QUERY',
                wildcard: '%QUERY',
                transform: function (resp) {
                    return resp.data;
                }
            }
        });
        
        $('#jobTitle').typeahead({
            highlight: true
        }, {
            limit: 10,
            source: jobTitleSearch,
            templates: {
                empty: [
                    '<div class="empty-message">',
                    'No existing job title were found.',
                    '</div>'
                ].join('\n')
            }
        });
    }
    
    function initUnlinkCompany() {
        flog('initUnlinkCompany');
        
        $(document.body).on('click', '.btn-unlink-company', function (e) {
            e.preventDefault();
            
            var form = $(this).closest('.form-horizontal');
            form.find('input[name=title]').val('');
            form.find('input[name=email]').val('');
            form.find('input[name=phone]').val('');
            form.find('input[name=address]').val('');
            form.find('input[name=addressLine2]').val('');
            form.find('input[name=addressState]').val('');
            form.find('input[name=postcode]').val('');
            form.find('input[name=leadOrgId]').val('');
            form.find('[name=country]').val('');
            form.find('.btn-unlink-company').css('display', 'none');
            
            form.trigger('submit');
        });
    }
    
    function initLeadOrgForm() {
        var leadOrgDetailsForm = $('#lead-org-form');
        leadOrgDetailsForm.forms({
            onSuccess: function (resp) {
                var btnSaveCompany = $('.btn-save-company');
                
                $('#leadOrgDetailsPreview, #btn-company-details-wrapper').reloadFragment({
                    whenComplete: function () {
                        if (btnSaveCompany.text().trim() === 'Create new company') {
                            btnSaveCompany.html('Save details');
                            Msg.success('New company is created');
                        } else {
                            Msg.success('Company details is saved')
                        }
                        
                        if (leadOrgDetailsForm.find('[name=title]').val() === '') {
                            leadOrgDetailsForm.find('.btn-unlink-company').css('display', 'none');
                        }
                    }
                });
            }
        });
    }
    
    function initUpdateUserModal() {
        var profileSearch = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: '/leads?profileSearch=%QUERY',
                wildcard: '%QUERY'
            }
        });
        
        var modal = $('#modal-change-profile');
        var form = modal.find('form');
        
        $('#updateUserFirstName', modal).typeahead({
            highlight: true
        }, {
            display: 'firstName',
            limit: 10,
            source: profileSearch,
            templates: {
                empty: [
                    '<div class="empty-message">',
                    'No existing contacts were found.',
                    '</div>'
                ].join('\n'),
                suggestion: Handlebars.compile(
                    '<div>'
                    + '<div>{{name}}</div>'
                    + '<div>{{phone}}</div>'
                    + '<div>{{email}}</div>'
                    + '</div><hr>')
            }
        });
        
        $('#updateUserFirstName', modal).bind('typeahead:select', function (ev, sug) {
            form.find('input[name=nickName]').val(sug.name);
            form.find('input[name=firstName]').val(sug.firstName);
            form.find('input[name=surName]').val(sug.surName);
            form.find('input[name=email]').val(sug.email);
            form.find('input[name=phone]').val(sug.phone);
        });
        
        form.forms({
            onSuccess: function (resp) {
                modal.modal('hide');
                Msg.success(resp.messages);
                $('#profile-body').reloadFragment();
            }
        });
    }
    
    function initLeadContactForm() {
        var form = $('#lead-contact-form');
        form.forms({
            onSuccess: function () {
                Msg.success('Contact is saved!');
            }
        })
    }
    
    function initFileUploads() {
        flog('initFileUploads');
        
        Dropzone.autoDiscover = false;
        $('#lead-files-upload').dropzone({
            paramName: 'file',
            maxFilesize: 2000.0, // MB
            addRemoveLinks: true,
            parallelUploads: 1,
            uploadMultiple: true,
            init: function () {
                this.on('success', function (file) {
                    flog('added file', file);
                    reloadFileList();
                });
                this.on('error', function (file, errorMessage) {
                    Msg.error('An error occured uploading: ' + file.name + ' because: ' + errorMessage);
                });
            }
        });
    }
    
    function initFileNoteEdit() {
        var noteModal = $('#editFileNoteModal');
        var noteForm = noteModal.find('form');
        
        $('body').on('click', '.edit-file-note', function (e) {
            e.preventDefault();
            
            var btn = $(this);
            var span = btn.closest('td').find('span');
            var leadId = btn.attr('href');
            
            noteForm.attr('action', window.location.pathname + leadId);
            noteForm.find('textarea[name=updateNotes]').val(span.html());
            
            noteModal.modal('show');
        });
        
        noteForm.forms({
            onSuccess: function () {
                reloadFileList();
                noteModal.modal('hide');
            }
        });
    }
    
    function reloadFileList() {
        $('#files-body').reloadFragment();
    }
    
    function initDateTimePickers() {
        flog('initDateTimePickers');
        
        var pickers = $('.date-time');
        flog("pickers", pickers);
        pickers.datetimepicker({
            format: 'DD/MM/YYYY HH:mm',
            keepInvalid: true,
            timeZone: window.KademiTimeZone
        });
    }
    
    function initCloseDealModal() {
        var closeDealModal = $("#closeDealModal");
        closeDealModal.on('shown.bs.modal', function () {
            closeDealModal.find("form").forms({
                onSuccess: function (resp) {
                    $('#lead-details').reloadFragment({
                        whenComplete: function () {
                            Msg.info('Deal marked as closed');
                            initViewLeadsPage();
                            closeDealModal.modal('hide');
                        }
                    });
                }
            });
        });
    }
    
    function initCancelLeadModal() {
        var cancelLeadModal = $("#modalCancelLead");
        cancelLeadModal.find("form").forms({
            onSuccess: function (resp) {
                $('#lead-details').reloadFragment({
                    whenComplete: function () {
                        Msg.info('Lead cancelled');
                        initViewLeadsPage();
                        cancelLeadModal.modal("hide");
                    }
                });
            }
        });
    }
    
    function initLeadActions() {
        $('#lead-details-form').forms({
            onSuccess: function () {
                Msg.success('Saved OK!');
            }
        });
        
        $(document.body).off('click', '.btn-reopen').on('click', '.btn-reopen', function (e) {
            e.preventDefault();
            
            Kalert.confirm('You want to reopen this lead?', function () {
                $.ajax({
                    type: 'POST',
                    data: {
                        reopenDeal: true
                    },
                    dataType: 'json',
                    success: function (resp) {
                        if (resp.status) {
                            $('#lead-details').reloadFragment({
                                whenComplete: function () {
                                    initViewLeadsPage();
                                }
                            });
                        }
                    },
                    error: function () {
                        Msg.error('Oh no! Something went wrong!');
                    }
                });
            });
        });
        
        $(document.body).on("click", "#assignToMenu a", function (e) {
            e.preventDefault();
            
            var name = $(e.target).attr("href");
            var href = $(this).closest('ul').data('href');
            
            $.ajax({
                type: 'POST',
                url: href || window.location.pathname,
                data: {
                    assignToName: name
                },
                dataType: 'json',
                success: function (resp) {
                    if (resp && resp.status) {
                        Msg.info("The assignment has been changed.");
                        
                        $("#assignedBlock").reloadFragment({
                            url: href || window.location.pathname
                        });
                    } else {
                        Msg.error("Sorry, we couldnt change the assignment");
                    }
                },
                error: function (resp) {
                    flog('error', resp);
                    Msg.error('Sorry couldnt change the assigned person ' + resp);
                }
            });
        });
        
    }
    
    function initAddTag() {
        $('body').on('click', '.addTag a', function (e) {
            e.preventDefault();
            
            var btn = $(this);
            var groupName = btn.attr('href');
            
            doAddToGroup(groupName);
        });
    }
    
    function doAddToGroup(groupName) {
        $('#view-lead-tags').tagsinput('add', {id: groupName, name: groupName});
    }
    
    function reloadTags() {
        $('#membershipsContainer').reloadFragment({
            whenComplete: function () {
                initTagsInput();
            }
        });
    }
    
    function initTagsInput() {
        var tagsSearch = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: '/leads/?asJson&tags&q=%QUERY',
                wildcard: '%QUERY'
            }
        });
        
        tagsSearch.initialize();
        
        $("#view-lead-tags").tagsinput({
            itemValue: 'id',
            itemText: 'name',
            typeaheadjs: {
                name: tagsSearch.name,
                displayKey: 'name',
                source: tagsSearch.ttAdapter()
            }
        });
        
        try {
            var data = JSON.parse($("#view-lead-tags").val());
            
            $.each(data, function (key, element) {
                $('#view-lead-tags').tagsinput('add', {id: element.id, name: element.name}, {preventPost: true});
            });
        } catch (e) {
            flog("Could not parse tags JSON " + e);
        }
        
        
        $("#view-lead-tags").on('beforeItemRemove', function (event) {
            if (event.options !== undefined && event.options.preventPost !== undefined && event.options.preventPost === true) {
                return;
            }
            
            var tag = event.item.id;
            
            if (confirm('Are you sure you want to remove this tag?')) {
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        deleteTag: tag
                    },
                    success: function (resp) {
                        if (resp.status) {
                            reloadTags();
                        } else {
                            Msg.error("Couldnt remove tag: " + resp.messages);
                            
                            reloadTags();
                        }
                    },
                    error: function (e) {
                        Msg.error(e.status + ': ' + e.statusText);
                        
                        reloadTags();
                    }
                });
            } else {
                event.cancel = true;
                return false;
            }
        });
        
        $('#view-lead-tags').on('beforeItemAdd', function (event) {
            if (event.options !== undefined && event.options.preventPost !== undefined && event.options.preventPost === true) {
                return;
            }
            
            var tag = event.item;
            
            $("#membershipsContainer .twitter-typeahead input").data("adding", true);
            
            $.ajax({
                type: 'POST',
                dataType: 'json',
                data: {
                    addTag: tag.id
                },
                success: function (resp) {
                    $("#membershipsContainer .twitter-typeahead input").data("adding", false);
                    
                    if (resp.status) {
                        reloadTags();
                    } else {
                        Msg.error("Couldnt add tag: " + resp.messages);
                        
                        reloadTags();
                    }
                },
                error: function (e) {
                    $("#membershipsContainer .twitter-typeahead input").data("adding", false);
                    
                    Msg.error(e.status + ': ' + e.statusText);
                    
                    reloadTags();
                }
            });
        });
        
        
        $("#membershipsContainer .twitter-typeahead input").on("keyup", function (event) {
            if (event.keyCode !== 13 || $(this).data("adding") === true) {
                return;
            }
            
            if (confirm('Are you sure you want to add this tag?')) {
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        title: $(this).val()
                    },
                    success: function (resp) {
                        if (resp.status) {
                            Msg.info(resp.messages);
                            reloadTags();
                        } else {
                            Msg.error("Couldnt add tag: " + resp.messages);
                            
                            reloadTags();
                        }
                    },
                    error: function (e) {
                        Msg.error(e.status + ': ' + e.statusText);
                        
                        reloadTags();
                    }
                });
            }
        });
        
        $("#membershipsContainer .twitter-typeahead").focus();
    }
    
})(jQuery, window);