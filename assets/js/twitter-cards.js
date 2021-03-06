/*jslint browser: true */
/*global jQuery, console */

var twitterHandle = "jimcamut";
var tweetProxy = '/twitter-proxy.php?url=' + encodeURIComponent('statuses/user_timeline.json?screen_name=' + twitterHandle + '&count=100&include_rts=false&exclude_replies=true');
var numOfTweets = 6;
var localData = JSON.parse(localStorage.getItem('twitterData')) || false;
var dataStream;
var K = function () { // from http://widgets.twimg.com/j/1/widget.js
    var a = navigator.userAgent;
    return {
        ie: a.match(/MSIE\s([^;]*)/)
    };
}();

jQuery.noConflict();
jQuery(document).ready(function ($) {


    if ($("#tweetContainer li").length === 0) {
        var now = new Date();
        var minute = 60000;
        var cutOff = (minute * 10); // 10 minutes
        var lastStored = function () {
            if (localData) {
                return Date.parse(localData.updated);
            } else {
                return (cutOff + 1);
            }
        };

        if ((now - lastStored()) >= cutOff || localData.data.length === 0) {
            setTimeout(getTweets, 500);
        } else {
            setTimeout(getTweetsFromLocalStorage, 500);
            // getTweets();
        }

    }


    $("#more-tweets").click(function (event) {
        event.preventDefault();
        getMoreTweets(numOfTweets);
    });

    function getTweetsFromLocalStorage() {
        console.log("Twitter data is from localStorage.");
        dataStream = localData.data;
        displayTweets(dataStream);
    }




    function createTweetNode(data) {
        var $tweetMedia;
        var $tweetNode = $("<li data-id=" + data.id + " class='new'><p class='tweet-head'><a href='https://twitter.com/" + data.name + "' target='_blank'>" + data.name + "</a> / " + data.dateParsed + "</p><p>" + data.tweet + "</p></li>");
        var $tweetIntents = $("<ul class='interact'>" +
            "<li><a href='https://twitter.com/intent/tweet?in_reply_to=" + data.id_str + "'>Reply</a></li>" +
            "<li><a href='https://twitter.com/intent/retweet?tweet_id=" + data.id_str + "'>Retweet</a></li>" +
            "<li><a href='https://twitter.com/intent/favorite?tweet_id=" + data.id_str + "'>Favorite</a></li>" +
            "</ul>");
        if (data.img) {
            $tweetMedia = $("<a href='" + data.imgUrl + "' class='tweet-img' target='_blank'><img src='" + data.img + "'  /></a>");
        } else {
            $tweetMedia = $("<a href='" + data.url+ "' class='tweet-img bird' target='_blank'><img src='/assets/img/twitter-bird.png'  /></a>");
        }
        $tweetNode.append($tweetMedia);
        $tweetNode.append($tweetIntents);
        return $tweetNode;
    }

    function displayTweets(data) {
        $("#tweets .loader").hide();
        $("#tweet-error").hide();

        var promiseTweetList = function () {
            var dfd = new jQuery.Deferred();
            dfd.resolve(returnTweetList(data));
            return dfd.promise();
        };


        $.when(promiseTweetList()).then(function (results) {
            var tweets;
            if (results) {
                tweets = results;
            }
            if (tweets) {
                for (var i = 0; i < numOfTweets; i++) {
                    if (tweets[i]) {
                        var $tweetNode = createTweetNode(tweets[i]);
                        $("#tweetContainer").append($tweetNode);
                    } else {
                        $("#tweet-error").show().html("Cannot display tweets at this time. Please try back later, or visit our Twitter page at <a href='https://twitter.com/" + twitterHandle + "' target='_blank'>https://twitter.com/" + twitterHandle + "</a>.");
                    }
                }
            } else {
                $("#tweet-error").show().html("Cannot display tweets at this time. Please try back later, or visit our Twitter page at <a href='https://twitter.com/" + twitterHandle + "' target='_blank'>https://twitter.com/" + twitterHandle + "</a>.");
            }
            var snippet = $("#tweetContainer > li");
            $.each(snippet, function (i, el) {
                setTimeout(function () {
                    $(el).addClass("added");
                }, (i + 1) * 100);
            });
        });
    }

    function getMoreTweets(numToShow) {
        var tweets = returnTweetList(dataStream);
        var publishedIDs = [];

        // get array with ids of published tweets
        // loop next numToShowTweets unil we have them

        function checkRemaining() {
            var numTweetsPublished = $("#tweetContainer > li").length;
            var numTweetsUnpublished = tweets.length;
            var remaining = (numTweetsUnpublished - numTweetsPublished);
            if (remaining <= 0) {
                $("#more-tweets").hide();
            }
        }

        $("#tweetContainer > li").each(function (i, el) {
            var id = $(el).data("id");
            publishedIDs[i] = id;
        }).promise().done(function () {
            var total = (publishedIDs.length + numToShow);
            for (var i = publishedIDs.length; i < total; i++) {
                if (tweets[i]) {
                    var $tweetNode = createTweetNode(tweets[i]);
                    $("#tweetContainer").append($tweetNode);
                } else {
                    $("#tweet-error").show().html("Cannot display tweets at this time. Please try back later, or visit our Twitter page at <a href='https://twitter.com/" + twitterHandle +"' target='_blank'>https://twitter.com/" + twitterHandle + "</a>.");
                }
            }
            var snippet = $("#tweetContainer > li.new");
            $.each(snippet, function (i, el) {
                setTimeout(function () {
                    $(el).addClass("added").removeClass("new");
                }, (i + 1) * 100);
            });
            checkRemaining();
        });
    }


    function getTweets() {
        $.ajax({
            type: "GET",
            url: tweetProxy,
            success: function (data) {

                dataStream = data;

                //display new tweets
                displayTweets(data);
                console.log("Twitter data is fresh from the Twitter API.");

                // Create Localstorage Object and Save
                var tempData = {};
                tempData.updated = new Date();
                tempData.data = data;
                localStorage.setItem('twitterData', JSON.stringify(tempData));

            },
            error: function (error) {
                $("#tweet-error").show().html("Cannot display tweets at this time. Please try back later, or visit our Twitter page at <a href='https://twitter.com/" + twitterHandle +"' target='_blank'>https://twitter.com/" + twitterHandle + "</a>.");
                console.log("getTweets error");
                console.log(error);
            }
        });
    }



    function newestTweet() {
        $.ajax({
            type: "GET",
            url: tweetProxy,
            success: function (data) {
                // console.log(data);
                var newTweets = data;
                var oldTweets = [];

                var promiseTweetList = function () {
                    function returnTweetList() {
                        $("#tweetContainer li").each(function (i, el) {
                            var did = $(el).data("id");
                            oldTweets.push(did);
                        });

                        return oldTweets;
                    }
                    var dfd = new jQuery.Deferred();
                    dfd.resolve(returnTweetList());
                    return dfd.promise();
                };

                $.when(promiseTweetList()).then(function (results) {
                    var oldTweets = results;
                    for (var i = 0; i < oldTweets.length; i++) {
                        for (var j = 0; j < newTweets.length; j++) {
                            if (newTweets[j].id === oldTweets[i]) {
                                newTweets.splice(j, 1);
                            }
                        }

                        if (i === (oldTweets.length - 1)) {
                            newTweets.reverse();
                            for (var k = 0; k < newTweets.length; k++) {
                                var newTweetsText = convertToLinks(newTweets[k].text);
                                $("#tweetContainer").prepend("<li class='new' data-id=" + newTweets[k].id + ">" + newTweetsText + "</li>");
                            }
                            $("#tweetContainer > li.new").addClass("added");
                        }
                    }
                });
            },
            error: function (error) {
                console.log("newest Tweets error");
                console.log(error);
            }
        });
    }

});


// Define Functions

function convertToLinks(text) {

    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://
    replacePattern1 = /(\b(https?):\/\/[-A-Z0-9+&amp;@#\/%?=~_|!:,.;]*[-A-Z0-9+&amp;@#\/%=~_|])/ig;
    replacedText = text.replace(replacePattern1, '<a class="colored-link-1" title="$1" href="$1" target="_blank">$1</a>');

    //URLs starting with "www."
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a class="colored-link-1" href="http://$2" target="_blank">$2</a>');

    // Replace Hashtags

    replacedText = replacedText.replace(/#(\S*)/g, '<a href="http://twitter.com/#!/search/$1"  target="_blank">#$1</a>');
    replacedText = replacedText.replace(/@([a-z\d_]+)/ig, '<a href="http://twitter.com/$1">@$1</a>');

    return replacedText;

}

function returnTweetList(data) {
    var tweetList = [];
    for (var i = 0; i < data.length; i++) {
        var newTweet = {};
        newTweet.tweet = convertToLinks(data[i].text);
        newTweet.id = data[i].id;
        newTweet.id_str = data[i].id_str;
        newTweet.name = data[i].user.name;
        if (data[i].entities.media) {
            newTweet.img = data[i].entities.media[0].media_url;
            newTweet.imgUrl = data[i].entities.media[0].expanded_url;
        }
        newTweet.url = "https://twitter.com/" + twitterHandle + "/status/" + data[i].id_str;
        newTweet.date = new Date(data[i].created_at);
        newTweet.dateParsed = parseTwitterDate(data[i].created_at);
        tweetList.push(newTweet);
    }
    return tweetList;
}

function parseTwitterDate(tdate) {
    var system_date = new Date(Date.parse(tdate));
    var user_date = new Date();
    if (K.ie) {
        system_date = Date.parse(tdate.replace(/( \+)/, ' UTC$1'));
    }
    var diff = Math.floor((user_date - system_date) / 1000);
    if (diff <= 1) {
        return "just now";
    }
    if (diff < 20) {
        return diff + " seconds ago";
    }
    if (diff < 40) {
        return "half a minute ago";
    }
    if (diff < 60) {
        return "less than a minute ago";
    }
    if (diff <= 90) {
        return "one minute ago";
    }
    if (diff <= 3540) {
        return Math.round(diff / 60) + " minutes ago";
    }
    if (diff <= 5400) {
        return "1 hour ago";
    }
    if (diff <= 86400) {
        return Math.round(diff / 3600) + " hours ago";
    }
    if (diff <= 129600) {
        return "1 day ago";
    }
    if (diff < 604800) {
        return Math.round(diff / 86400) + " days ago";
    }
    if (diff <= 1209600) {
        return "over a week ago";
    }
    if (diff < 2629740) {
       return Math.round(diff / 604800) + " weeks ago";
    }

    else {
        var date = new Date(system_date);
        return "on " + (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear();
    }

    // return "on " + system_date;
}