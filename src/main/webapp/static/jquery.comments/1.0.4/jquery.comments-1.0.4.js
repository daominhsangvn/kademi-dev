/**
 *  jquery.comments-1.0.4.js
 */

(function ($) {
    /**
     * The default configurations of comments
     * @name CommentConfig
     * @namespace
     * @version 1.0.4
     * @property {String} [pageUrl=window.location] The url of the resource to add comments to. Must end with a slash
     * @property {String} [streamSelector=.comments-stream] The selector of stream wrapper which wraps all comments
     * @property {String} [commentTextSelector=#postQuestion] The selector of textbox which contain the comment content
     * @property {Function} renderCommentFn The callback function to render the markup for a comment. Takes the following arguments commentData, config, container
     * @property {Function} clearContainerFn The callback function to clear the comments container. Takes no arguments
     * @property {Function} ajaxLoadingFn The callback function to show ajax loading. Takes one argument isLoading (true/false)
     * @property {Number} [itemsPerPage=10] The number of comments will be showed per page
     * @property {Function} paginateFn The callback function to render the markup for pagination
     * @property {Boolean} [aggregated=false] If true will list all comments under the given page
     * @property {Function} afterCommentFn The callback will be called after user write a comment
     * @property {Function} afterReplyFn The callback will be called after user reply a comment
     */
    var DEFAULT_COMMENTS_OPTIONS = {
        pageUrl: window.location,
        streamSelector: '.comments-stream',
        commentTextSelector: '#postQuestion',
        renderCommentFn: function (commentData, config, container) {
            flog('renderCommentFn-104-standard', 'commentData=', commentData, 'container=', container);
            
            var user = commentData.user;
            var date = new Date(commentData.date);
            var commentText = commentData.comment;
            var commentId = commentData.id;
            var parentId = commentData.parentId;
            var outerDiv = $('#' + commentId);

            if (outerDiv.length === 0) {
                var commentStream = container.find(config.streamSelector);
                var parentComment = $('#' + parentId);
                var isReply = false;
                if(parentComment.length > 0){
                    commentStream = parentComment;
                    isReply = true;
                }
                flog('Append new comment block to: ', commentStream, "Selector: ", config.streamSelector);

                var commentString = '';

                // User's name and profile picture
                var commentUserString = '';
                if (user !== null && typeof user !== 'undefined') {
                    var profilePic = profileImg(user);
                    commentUserString += '<a class="profilePic comment-user-pic" href="' + user.href + '">' + profilePic + '</a>';
                    commentUserString += '<a class="user comment-user-name" href="' + user.href + '">' + user.name + '</a>';
                } else {
                    commentUserString += '<span class="comment-user-pic profilePic"><img src="/templates/apps/user/profile.png" alt="Anonymous" /></span>';
                    commentUserString += '<span class="user comment-user-name">Anonymous</span>';
                }
                commentString += '<div class="comment-user">';
                commentString += commentUserString;
                commentString += '</div>';

                // Comment content and time
                var commentDetailString = '';

                // Comment text
                commentDetailString += '<p class="comment-content cmt">' + commentText + '</p>';

                // Comment reply button
                if(!isReply){
                    commentDetailString += '<a class="comment-reply small" href="#">Reply</a>';
                }

                // Comment datetime
                flog('Comment datetime: ', date);
                var dt = {
                    date: date.getDate(),
                    month: date.getMonth(),
                    year: date.getYear(),
                    hour: date.getHours(),
                    minute: date.getMinutes()
                };
                commentDetailString += '<abbr title="' + date.toISOString() + '" class="comment-time auxText small text-muted">' + toDisplayDateNoTime(dt) + '</abbr>';

                // Reply for comment
                if(!isReply){
                    commentDetailString += '<div class="comment-replies-wrapper" style="display: none;">';
                    commentDetailString += '    <div class="comment-replies"></div>';
                    commentDetailString += '    <textarea class="form-control input-sm comment-reply-text" rows="1" data-parentid="' + commentId + '" placeholder="Write a reply..."></textarea>';
                    commentDetailString += '    <div class="text-right">';
                    commentDetailString += '        <button type="button" class="btn btn-xs btn-info comment-reply-send">Send</button>';
                    commentDetailString += '    </div>';
                    commentDetailString += '</div>';
                }

                // Comment comment detail block
                commentString += '<div class="comment-detail">';
                commentString += commentDetailString;
                commentString += '</div>';

                // Append comment block to comment stream
                var commentClass = 'forumReply comment';
                if(isReply){
                    commentClass = 'comment comment-sub col-md-offset-1';
                }
                commentStream.append(
                    '<div class="' + commentClass + '" id="' + commentId + '">' + commentString + '</div>'
                );
                outerDiv = $('#' + commentId);

                // Event handle for reply text
                var btnReply = outerDiv.find('.comment-reply');
                var replyWrapper = outerDiv.find('.comment-replies-wrapper');

                btnReply.on('click', function (e) {
                    e.preventDefault();

                    if (replyWrapper.is(':visible')) {
                        replyWrapper.hide();
                    } else {
                        replyWrapper.show();
                    }
                });

                var btnSendReply = outerDiv.find('.comment-reply-send');
                var txtReplyText = outerDiv.find('.comment-reply-text');

                btnSendReply.on('click', function (e) {
                    e.preventDefault();

                    var replyText = txtReplyText.val().trim();

                    if (replyText) {
                        flog('Submit reply text:', replyText);
                        var replyInput = outerDiv.find('textarea.comment-reply-text');
                        sendCommentReply(config.pageUrl, replyInput, replyInput.data('parentid'), config.renderCommentFn, config.currentUser, config, container);
                        replyWrapper.hide();
                    }
                });
            } else {
                flog('Update existing comment');

                // Just update
                outerDiv.find('.cmt, .comment-content').html(commentText);
            }

            jQuery('abbr.auxText, .comment-time', outerDiv).timeago();
        },
        clearContainerFn: function (config, container) {
            container.find(config.streamSelector).html('');
        },
        ajaxLoadingFn: function (isLoading) {
            if (isLoading) {
                ajaxLoadingOn();
            } else {
                ajaxLoadingOff();
            }
        },
        itemsPerPage: 10,
        paginateFn: function (comments, config, container) {
            flog('paginateFn-104-standard', comments, config, container);

            var totalComments = 0;
            for (var i = 0; i < comments.length; i++) {
                var comment = comments[i];

                if (!comment.parentId) {
                    totalComments++;
                }
            }
            var itemsPerPage = config.itemsPerPage;

            if (totalComments > itemsPerPage) {
                container.prepend(
                    '<div class="well well-sm text-center">' +
                    '    <a href="" class="btn-show-more">Show previous comments</a>'+
                    '</div>'
                );

                var commentWrappers = container.find('.comment').not('.comment-sub');

                // Show 10 last comments
                commentWrappers.filter(':lt(' + (totalComments - itemsPerPage) + ')').hide().addClass('hidden-comment');

                container.find('.btn-show-more').click(function (e) {
                    e.preventDefault();

                    var hiddenCommentWrappers = commentWrappers.filter('.hidden-comment');
                    var totalHiddenComments = hiddenCommentWrappers.length;

                    hiddenCommentWrappers.filter(':gt(' + (totalHiddenComments - itemsPerPage - 1) + ')').show().removeClass('hidden-comment');

                    if (totalHiddenComments <= itemsPerPage) {
                        $(this).parent().hide();
                    }
                });
            }
        },
        aggregated: false,  // if true will list all comments under the given page,
        afterCommentFn: function (commentData, config, container) {
            flog('afterCommentFn-104-standard', commentData, config, container);
        },
        afterReplyFn: function (commentData, config, container) {
            flog('afterReplyFn-104-standard', commentData, config, container);
        }
    };

    /**
     * See (http://jquery.com/).
     * @name $
     * @class
     * See the jQuery Library (http://jquery.com/) for full details. This just
     * documents the function and classes that are added to jQuery by this plug-in.
     */

    /**
     * See (http://jquery.com/)
     * @name fn
     * @class
     * See the jQuery Library (http://jquery.com/) for full details. This just
     * documents the function and classes that are added to jQuery by this plug-in.
     * @memberOf $
     */

    /**
     * Show comments
     * @name comments
     * @class
     * @memberOf $.fn
     * @version 1.0.4
     * @param {CommentConfig} options Configuration of comment
     */
    $.fn.comments = function (options) {
        var container = this;
        var config = $.extend({}, DEFAULT_COMMENTS_OPTIONS, options);

        var form = container.find('form');
        flog('Register submit event: ', form);

        form.submit(function (e) {
            e.preventDefault();
            e.stopPropagation();

            try {
                sendNewForumComment(config.pageUrl, container.find(config.commentTextSelector), config.renderCommentFn, config.currentUser, config, container);
            } catch (e) {
                flog('Exception sending forum comment', e);
            }
            return false;
        });
        initWebsockets(config, container);

        loadComments(config, container);
    };

    function initWebsockets(config, container) {
        var path = window.location.pathname;
        flog('initWebsockets', window.location.host, path);
        
        var b64ContentId = Base64.encode(path);
        try {
            var port = parseInt(window.location.port || 80) + 1;
            var proto = 'ws://';
            if (window.location.protocol === 'https:') {
                proto = 'wss://';
                port = parseInt(window.location.port || 443) + 1;
            }
            wsocket = new WebSocket(proto + window.location.hostname + ':' + port + '/comments/' + window.location.hostname + '/content/' + b64ContentId);
            wsocket.onmessage = function (evt) {
                var comment = $.parseJSON(evt.data);
                flog('onMessage', comment);

                config.renderCommentFn(comment, config, container);
            };

            flog('Done initWebsockets');
        } catch (e) {
            // TODO: setup polling to load comments every minute or so
            flog('Websocket initialisation failed. Live comment stream is not available');
        }
    }
})(jQuery);

function sendNewForumComment(pageUrl, commentInput, renderComment, currentUser, config, container) {
    flog('sendNewForumComment', pageUrl, commentInput, renderComment, currentUser, config, container);

    var comment = commentInput.val();
    commentInput.removeClass('errorField');

    if (comment.trim().length < 1) {
        commentInput.addClass('errorField');
        return;
    }

    var url = pageUrl;
    if (!url.endsWith('/')) {
        url += '/';
    }
    url += '_comments';

    var data = {
        newComment: comment
    };

    ajaxLoadingOn();

    $.ajax({
        type: 'POST',
        url: url,
        data: data,
        dataType: 'json',
        success: function (resp) {
            ajaxLoadingOff();

            commentInput.val('');
            commentInput.keyup();

            flog('resp', resp.status, resp);
            if (resp.status) {
                var c = resp.data;

                invokeRenderFn(c, renderComment, config, container);
                config.afterCommentFn(c, config, container);
            } else {
                alert('Sorry, there was a problem posting your comment. Please try again');
            }
        },
        error: function () {
            ajaxLoadingOff();
            alert('Sorry, we could not process your comment. Please try again later');
        }
    });
}

function loadComments(config, container) {
    flog('loadComments');

    var page = config.pageUrl;
    var clearContainerFn = config.clearContainerFn;

    var url = page;
    if (!url.endsWith('/')) {
        url += '/';
    }
    url += '_comments';

    $.getJSON(url, function (response) {
        flog('Got comments response', response);
        clearContainerFn(config, container);
        processComments(response, config, container);
    }).fail(function () {
        flog('Failed to load comments', container);
        clearContainerFn(config, container);

        if (container) {
            container.hide();
        }
    });
}

function processComments(comments, config, container) {
    if (comments) {
        comments.sort(dateOrd);

        $.each(comments, function (i, comment) {
            invokeRenderFn(comment, config.renderCommentFn, config, container);
        });

        config.paginateFn(comments, config, container);
    }
}

function invokeRenderFn(comment, renderCommentFn, config, container) {
    renderCommentFn(comment, config, container);
}

function sendCommentReply(pageUrl, commentInput, parentId, renderComment, currentUser, config, container) {
    flog('sendCommentReply', pageUrl, commentInput, parentId, renderComment, currentUser, config, container);

    var comment = commentInput.val();
    commentInput.removeClass('errorField');

    if (comment.trim().length < 1) {
        commentInput.addClass('errorField');
        return;
    }

    var url = pageUrl;
    if (!url.endsWith('/')) {
        url += '/';
    }
    url += '_comments';

    var data = {
        newComment: comment,
        parentComment: parentId
    };

    ajaxLoadingOn();

    $.ajax({
        type: 'POST',
        url: url,
        data: data,
        dataType: 'json',
        success: function (resp) {
            ajaxLoadingOff();

            commentInput.val('');
            commentInput.keyup();

            flog('resp', resp.status, resp);
            if (resp.status) {
                var c = resp.data;
                c.parentId = parentId;

                invokeRenderFn(c, renderComment, config, container);
                config.afterReplyFn(c, config, container);
            } else {
                alert('Sorry, there was a problem posting your comment. Please try again');
            }
        },
        error: function () {
            ajaxLoadingOff();
            alert('Sorry, we could not process your comment. Please try again later');
        }
    });
}