function CommentsViewModel() {
    var self = this;
    
    self.threads = ko.observableArray([]);

    self.history = [0];
    self.history_observed = ko.observableArray([0]);
    self.history_index = ko.observable(0);
    self.history_last_back = ko.observable(false);
    self.history_last_back_top = ko.observable(0);
    self.history_top = ko.observable(0);
    self.history_scrolling = false;

    var comments_ref = new Firebase('https://hackernews.firebaseIO.com/comments/long');

    // Firebase security rule
    // {
    //   "rules": {
    //     ".read": true,
    //     "comments":{
    //       "long": {
    //         "$comment": {
    //           "tag": {
    //             ".write": true,
    //             ".validate": "newData.val() == '' || newData.val() == 'clear' || newData.val() == 'against' || newData.val() == 'neutral' || newData.val() == 'for' || newData.val() == 'info' || newData.val() == 'question'"
    //           }
    //         }
    //       }
    //     }
    //   }
    // }    

    function Comment(name, comment, snapshot) {

      filtered_comment = comment.replace(/<p><font size="1"><font color="#f6f6ef">-----<\/font><\/font><\/p>/,'').replace(/<p><font size="1"><u><a href="reply[^"]*">reply<\/a><\/u><\/font><\/p>/,'').replace(/<font color[^>]*>/g,'').replace(/<\/font>/g,'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&lt;(\/?([abipu]|pre|code))&gt;/g,'<$1>').replace(/&lt;(a href="[^"]*" rel="nofollow")&gt;/g,'<$1>');


      // if (comment.indexOf("<pre>") !== -1)
      // {
      //   console.log(comment);
      //   console.log(filtered_comment);
      // }

      var this_comment = this;
      this_comment.name = ko.observable(name);
      this_comment.comment = ko.observable(filtered_comment);
      this_comment.snapshot = ko.observable(snapshot);
      this_comment.parent = ko.computed(function() {        
        var comment = ko.utils.arrayFirst(self.threads(), function(item) {
                        return item.snapshot().name() == this_comment.snapshot().val().parent;
                      });
        return comment;
      }).extend({ throttle: 1 });
      this_comment.children = ko.computed(function() {
        var children = [];
        this_comment.snapshot().child("children").forEach(function(child) {
          var comment = ko.utils.arrayFirst(self.threads(), function(item) {
                          return item.snapshot().name() == child.name();
                        });
          children.push({name: child.name(), comment: comment});
        });
        // console.log("Comment", children);
        return children;
      }).extend({ throttle: 1 });
    }

    self.new_thread = function() {
      comments_ref.push({ name: 'Date and Time', comment: 'The date and time is ' + new Date()});
    };

    self.new_thread_child = function() {

      var current_thread = this.snapshot();

      var parents = current_thread.child("parents").numChildren();

      // create child
      var child = comments_ref.push({ name: (new Array(parents+1).join('Re: ')) + 'Reply', comment: 'The date and time is ' + new Date() });
      
      // add parent's name to child
      child.child("parents").child(current_thread.name()).set(true);
      child.child("parent").set(current_thread.name());
      
      // add child's name to parent
      current_thread.ref().child("children").child(child.name()).set(true);
    };

    self.update_thread = function() {
        this.snapshot().ref().update({ comment: 'The date and time is ' + new Date() });
    };
 
    self.remove_thread = function() {
      var remove_name = this.snapshot().name();
      console.log("remove_thread", remove_name);

      // remove name from parents
      this.snapshot().child("parents").forEach(function(snapshot) {
        var parent_name = snapshot.name();
        comments_ref.child(parent_name).child("children").child(remove_name).remove();        
      });

      // remove name from children
      this.snapshot().child("children").forEach(function(snapshot) {
        var child_name = snapshot.name();
        comments_ref.child(child_name).child("parents").child(remove_name).remove();        
      });      

      // remove
      this.snapshot().ref().remove();
    };


    //
    // tagging...
    //

      self.tag_thread = function(side) {
        var data = this;
        data.snapshot().ref().child("tag").set(side);
      };

    //
    // scrolling...
    //
    // http://stackoverflow.com/questions/11936637/anchor-onclick-division-highlight

      function console_scroll() {

        $('.side-b').scroll(function(){ console.log($(this).height() , this.scrollTop, $('#p2-002-2120521')[0].offsetTop); });
        $('.side-b').scroll(function(){ console.log(this.scrollTop); });
        


        $('.side-a, .side-b, .side-c').off('scroll');
        $('.side-b').scroll(function(){ 

          console.log(
            "scroll"
            , ", height:"
            , $('.side-b').height()
            , ", side scrollTop a b:"
            , $('.side-a')[0].scrollTop
            , $('.side-b')[0].scrollTop
            , ", comment offset a b:"
            , $('#c-002-2120521')[0].offsetTop
            , $('#p-002-2120521')[0].offsetTop
            , ", height + scrollTop a b:"
            , $('.side-b').height() + $('.side-a')[0].scrollTop
            , $('.side-b').height() + $('.side-b')[0].scrollTop            
            , ", height + scrollTop - offset a b:"
            , $('.side-b').height() + $('.side-a')[0].scrollTop - $('#c-002-2120521')[0].offsetTop
            , $('.side-b').height() + $('.side-b')[0].scrollTop - $('#p-002-2120521')[0].offsetTop            
            );

          var difference = $('.side-b').height() + $('.side-b')[0].scrollTop - $('#p-002-2120521')[0].offsetTop 
                            - (
                                $('.side-b').height() + $('.side-a')[0].scrollTop - $('#c-002-2120521')[0].offsetTop
                              );

          if ( $('.side-b').height() + $('.side-b')[0].scrollTop - $('#p-002-2120521')[0].offsetTop >= 0 
                && $('.side-b').height() + $('.side-b')[0].scrollTop - $('#p-002-2120521')[0].offsetTop <= $('.side-b').height() - 80
                && difference > 0
              ) {

            $('.side-a')[0].scrollTop += difference;
            $('.side-c')[0].scrollTop = $('.side-b')[0].scrollTop;


          }

        });



      }

      self.scroll_to = function(selector, side, bottom) {
        if (self.history_scrolling) return;

          // console.log("\nscroll_to", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, $(side).scrollTop());
          // self.history_scrolling = true;

          var $li = $( selector );

          // console.log($li, $li[0]);
          if ($li[0] == null) return false;

          var scroll_to_top = Math.floor( $li[0].offsetTop ) - 80;

          if (bottom) {
            scroll_to_top = Math.floor( $li.find('li')[0].offsetTop ) - 80;
          }


          // if ( Math.abs( $(side).scrollTop() - self.history[self.history_index()] ) > 3 ) {
          //   self.history.splice(self.history_index()+1, self.history.length, Math.floor($(side).scrollTop()));
          //   self.history_index(self.history_index()+1);
          //   self.history_observed(self.history);
          // }

          // if (self.history[self.history_index()] != scroll_to_top) {
          //   self.history.splice(self.history_index()+1, self.history.length, scroll_to_top);
          //   self.history_index(self.history_index()+1);
          //   self.history_observed(self.history);
          // }
          self.history_last_back(false);
          // console.log("scroll_to go", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, scroll_to_top);

          // console.log($(side));

          $(side).animate({
              scrollTop: scroll_to_top
          }, 500, function(){ 

            // var body_top = $(side).scrollTop();
            // if ( Math.abs( body_top - self.history[self.history_index()] ) > 3 ) {
            //   // self.history[self.history_index()] = Math.floor( body_top );
            //   // self.history_observed(self.history);
            //   self.history.splice(self.history_index()+1, self.history.length, body_top);
            //   self.history_index(self.history_index()+1);
            //   self.history_observed(self.history);
            // }
            // self.history_top(body_top);
            // self.history_scrolling = false; 
            // console.log("done", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, $(side).scrollTop()); 
            $li.animate({'opacity':0.5},500, function(){ $li.animate({'opacity':1}, 500)}); 
          });
      };

      self.scroll_to_history_back = function() {
        if (self.history_scrolling) return;
          
          // console.log("\nback", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, $('.side-b').scrollTop());
          self.history_scrolling = true;

          var scroll_to_top = 0;

          if ( Math.abs( $('.side-b').scrollTop() - self.history[self.history_index()] ) > 3 ) {
            self.history_last_back(true);
            self.history_last_back_top(Math.floor( $('.side-b').scrollTop()));         
          } else {
            if (self.history_index() > 0) self.history_index(self.history_index()-1);          
          }
          
          scroll_to_top = self.history[self.history_index()];

          $('.side-b').animate({
            scrollTop: scroll_to_top
          }, 500, function(){ 
            var body_top = $('.side-b').scrollTop();
            self.history_top(body_top);
            self.history_scrolling = false; 

            // console.log("done", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, $('.side-b').scrollTop()); 
          });
          // console.log("back go", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history);
      };

      self.scroll_to_history_forward = function() {
        if (self.history_scrolling) return;
        
          // console.log("\nforward", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, $('.side-b').scrollTop());
          self.history_scrolling = true;
          
          var scroll_to_top = 0;

          scroll_to_top = self.history[self.history_index()];
          if (self.history_last_back()) {
            scroll_to_top = self.history_last_back_top();
            self.history_last_back(false);
          } else if (self.history_index() < self.history.length-1) {
            self.history_index(self.history_index()+1);
            scroll_to_top = self.history[self.history_index()];
          } else {
            self.history_scrolling = false;
            return;
          }

          $('.side-b').animate({
            scrollTop: scroll_to_top
          }, 500, function(){ 
            var body_top = $('.side-b').scrollTop();
            self.history_top(body_top);

            self.history_scrolling = false;
            // console.log("done", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history, $('.side-b').scrollTop()); 
          });
          // console.log("forward go", self.history_index(), self.history[self.history_index()], self.history_last_back(), self.history_last_back_top(), self.history);
      };
      self.scroll_to_history_bars = ko.computed(function() {
        var page_height = $('.side-b').prop("scrollHeight");
        var bars = [];
        for (var i = 1; i < self.history_observed().length; i++) {
          var top = 0,
              bottom = 0;

          var height = 0;

          if (self.history[i-1] < self.history[i]) {
            top = self.history[i-1];
            bottom = self.history[i];
          } else {
            top = self.history[i];
            bottom = self.history[i-1];
          }

          height = (bottom-top)*100/page_height;

          bars.push({top: Math.floor(top*100/page_height), height: Math.ceil(height)});
        };
        // console.log("\nbars", bars, self.history);
        return bars;
      }).extend({throttle:1});

      self.scroll_to_parent = function(side) {
        var data = this;
        var selector = ( "#p-" + (data.snapshot().val().parent || data.snapshot().name()) );
        self.scroll_to(selector, side);
      };
      self.scroll_to_parent_child = function(side) {
        var data = this;
        var selector = ( data.snapshot().val().parent != null ? "#c-" + data.snapshot().name() : "#p-" + data.snapshot().name() );
        self.scroll_to(selector, side);
      };
      self.scroll_to_child = function(side) {
        var data = this;

        if (data.snapshot().child("children").numChildren() == 0) return;

        var selector = ("#p-" + data.snapshot().name());
        self.scroll_to(selector, side, false);
      };


      self.scroll_for_parent = function(side) {
        var data = this;


        var selector = ( data.snapshot().val().parent != null ? "#c-" + data.snapshot().name() : "#p-" + data.snapshot().name() );
        
        if (side == ".side-a") {

          self.scroll_to(selector, side);

          if (data.snapshot().child("children").numChildren() == 0) return;

          selector = ("#p-" + data.snapshot().name());

          self.scroll_to(selector, ".side-b", true);

          $.each(data.snapshot().val().children, function(child) {
            // console.log("child", child);
            var selector_child = ("#p-" + child);
            if (self.scroll_to(selector_child, ".side-c", true) == false)
              self.scroll_to(selector, ".side-c", true);

            return false;
          });          

          return;

        }

        if (side == ".side-b") {

          $('.side-a, .side-b, .side-c').off('scroll');

          var scroll_comment = data.snapshot().name();
          var difference = ($('.side-b')[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop) - ($('.side-a')[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop);
       
          $('.side-a')[0].scrollTop += difference;
          $('.side-c')[0].scrollTop = $('.side-b')[0].scrollTop;

          self.scroll_sync(scroll_comment);

          return;




          self.scroll_to(selector, side);

          var selector_parent = ("#c-" + data.snapshot().name());
          // console.log("selector_parent", selector_parent);
          self.scroll_to(selector_parent, ".side-b");  

          selector = ("#p-" + data.snapshot().name());

          self.scroll_to(selector, ".side-c", true);
          return;

        }

        if (side == ".side-c") {

          if (data.snapshot().child("children").numChildren() == 0) return;        

          selector = ("#p-" + data.snapshot().val().parent);

          self.scroll_to(selector, ".side-b");

          selector = ("#p-" + data.snapshot().name());

          self.scroll_to(selector, ".side-c");

          return;
          
        }

          
      };      

      self.scroll_for_child = function(side) {
        var data = this;


        var selector = ( data.snapshot().val().parent != null ? "#c-" + data.snapshot().name() : "#p-" + data.snapshot().name() );
        
        if (side == ".side-a") {

          $('.side-a, .side-b, .side-c').off('scroll');

          var scroll_comment = data.snapshot().name();
          var difference = ($('.side-b')[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop) - ($('.side-a')[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop);

          $('.side-b')[0].scrollTop -= difference;
          $('.side-c')[0].scrollTop = $('.side-b')[0].scrollTop;

          self.scroll_sync(scroll_comment);

          return;



          self.scroll_to(selector, side);

          if (data.snapshot().child("children").numChildren() == 0) return;

          selector = ("#p-" + data.snapshot().name());

          self.scroll_to(selector, ".side-b", true);

          $.each(data.snapshot().val().children, function(child) {
            // console.log("child", child);
            var selector_child = ("#p-" + child);
            if (self.scroll_to(selector_child, ".side-c", true) == false)
              self.scroll_to(selector, ".side-c", true);

            return false;
          });          

          return;

        }

        if (side == ".side-b") {

          self.scroll_to(selector, side);

          var selector_parent = ("#c-" + data.snapshot().val().parent);
          // console.log("selector_parent", selector_parent);
          self.scroll_to(selector_parent, ".side-a");

          if (data.snapshot().child("children").numChildren() == 0) return;        

          selector = ("#p-" + data.snapshot().name());

          self.scroll_to(selector, ".side-c", true);
          return;

        }

        if (side == ".side-c") {

          if (data.snapshot().child("children").numChildren() == 0) return;        

          selector = ("#p-" + data.snapshot().val().parent);

          self.scroll_to(selector, ".side-b");

          selector = ("#p-" + data.snapshot().name());

          self.scroll_to(selector, ".side-c");

          return;
          
        }

          
      };

      self.scroll_sync = function(scroll_comment) {

        var side_height = $('.side-a').height();

        var $side_left = $('.side-a');
        var $side_right = $('.side-b');

        $('.side-a, .side-b, .side-c').off('scroll');
        $('.side-a, .side-b').scroll(function(){ 

          console.log(
            "scroll"
            , ", height:"
            , side_height
            , ", side scrollTop a b:"
            , $side_left[0].scrollTop
            , $side_right[0].scrollTop
            , ", comment offset a b:"
            , $('#c-'+scroll_comment)[0].offsetTop
            , $('#p-'+scroll_comment)[0].offsetTop
            , ", height + scrollTop a b:"
            , side_height + $side_left[0].scrollTop
            , side_height + $side_right[0].scrollTop            
            , ", height + scrollTop - offset a b:"
            , side_height + $side_left[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop
            , side_height + $side_right[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop            
            );

        });
        $side_left.scroll(function(){ 

          var difference = ($side_right[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop) - ($side_left[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop);

          // sync top when scrolling
          if ( side_height + $side_left[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop >= 0 
                && side_height + $side_left[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop <= side_height - 80
                // && difference > 0
              ) {

            $side_right[0].scrollTop -= difference;
            $('.side-c')[0].scrollTop = $side_right[0].scrollTop;

          }

          // sync top
          if ( side_height + $side_left[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop > side_height - 80 ) {
            $side_right[0].scrollTop = $('#p-'+scroll_comment)[0].offsetTop - 80;
          }          

        }); // scroll end
        $side_right.scroll(function(){ 

          var difference = ($side_right[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop) - ($side_left[0].scrollTop - $('#c-'+scroll_comment)[0].offsetTop);

          // sync top when scrolling
          if ( side_height + $side_right[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop >= 0 
                && side_height + $side_right[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop <= side_height - 80
                && difference > 0
              ) {

            $side_left[0].scrollTop += difference;
            $('.side-c')[0].scrollTop = $side_right[0].scrollTop;

          }

          // sync top
          if ( side_height + $side_right[0].scrollTop - $('#p-'+scroll_comment)[0].offsetTop > side_height - 80 ) {
            $side_left[0].scrollTop = $('#c-'+scroll_comment)[0].offsetTop - 80;
          }

        }); // scroll end

      };

    //
    // firebase events
    //
    comments_ref.on('child_added', function(snapshot, prev_child) {
      // console.log("child_added", snapshot.val())
      var comment_val = snapshot.val();
      var comment_ref = snapshot.ref();
      var comment = new Comment(comment_val.name, comment_val.comment, snapshot);

      self.threads.push(comment);
    });

    comments_ref.on('child_changed', function(snapshot, prev_child) {
      // console.log("child_added", snapshot.val())
      var comment_val = snapshot.val();
      var comment_ref = snapshot.ref();

      var comment = ko.utils.arrayFirst(self.threads(), function(item) {
        return item.snapshot().name() == snapshot.name();
      });

      comment.snapshot(snapshot);
      // comment.name(comment_val.name);
      // comment.comment(comment_val.comment);

      // comment = new Comment(comment_val.name, comment_val.comment, snapshot);
      // self.threads.valueHasMutated();

    });
    comments_ref.on('child_removed', function(snapshot) {      
      self.threads.remove(function(comment){ return comment.snapshot().name() == snapshot.name(); });
    });
}

//
// ready
//
$(function(){

  // $('noscript').
  var comments_view_model = new CommentsViewModel();
  ko.applyBindings(comments_view_model);
  $("#loading").fadeOut();
  $("#loading-a").fadeOut();
  $("#loading-b").fadeOut();
  $("#loading-c").fadeOut();
  // http://forum.jquery.com/topic/how-to-catch-keypress-on-body
  $(document).keypress(function(event) {
      // console.log('Handler for .keypress() called. - ' + event.charCode);
      switch (event.charCode) {
        case 44:
        case 91:
          comments_view_model.scroll_to_history_back();
          break;
        case 46:
        case 93:
          comments_view_model.scroll_to_history_forward();
          break;
      }
  });

  $(window).resize(function(){comment_affix();});


  // $(window).resize(function(){$('.side').height( $(window).height() - 180 );});
  // $('.side').height( $(window).height() - 180 );

});

//
// tests
//
function test_scroll_to_history() {
  /*
  start 0
  scroll
  back
    save top
    scroll to 0
  forward
    scroll to saved
  scroll
  back
    save top
    scroll to 0
  click replies
    save top
    scroll to replies
  back
    scroll to 0
  forward
    scroll to replies
  scroll
  back
    save top
    scroll to replies
  forward
    scroll to saved

  */
}

//
// misc
//
function comment_affix() {

  console.log('comment_affix()');

  $('.affix-style').remove();
  $('.comment-90').each(function(i, c){ 
    var cpp = c.parentElement.parentElement;
    if (cpp.scrollHeight > 600) {
      // $(c).addClass('comment-side-text');
      var offset_bottom = $('body').height() - cpp.offsetTop - cpp.scrollHeight + 300;
      console.log(i, $('body').height(), cpp.offsetTop, cpp.scrollHeight, offset_bottom, cpp.id);
      $("<style type='text/css' class='affix-style'> #" + cpp.id + " > .comment-side > .affix-bottom { bottom: " +  offset_bottom + "px;} </style>").appendTo("head");

      $(c).affix({offset:{top:cpp.offsetTop-64, bottom: offset_bottom}});
      // $(c).affix({offset:{top:c.parentElement.offsetTop-64}});
    }
  });

}

// http://stackoverflow.com/questions/1957142/javascript-gettimeout
// http://stackoverflow.com/a/1957428/202448
function SpecialTimeout(fn, ms) {
    this.ms = ms;
    this.fn = fn;
    this.timer = null;
    this.init();
}

SpecialTimeout.prototype.init = function() {
    this.cancel();
    this.timer = setTimeout(this.fn, this.ms);
    return this;
};

SpecialTimeout.prototype.change = function(ms) {
    this.ms += ms;
    this.init();
    return this;
};

SpecialTimeout.prototype.cancel = function() {
    if ( this.timer !== null ) {
        clearTimeout(this.timer);
        this.timer = null;
    }
    return this;
};

var affix_timer = new SpecialTimeout(comment_affix, 1000);


// hn - console script to export comments, run twice.
function get_hn_comments() {

  // try {
    // http://www.hunlock.com/blogs/Howto_Dynamically_Insert_Javascript_And_CSS
    var headID = document.getElementsByTagName("head")[0];
    var newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.src = 'https://cdn.firebase.com/v0/firebase.js';
    headID.appendChild(newScript);

    var subtext = document.getElementsByClassName('subtext')[0];
    var main_id = "000-";// ex: "http://news.ycombinator.com/item?id=4947963"

    try {
      main_id += subtext.getElementsByTagName('a')[subtext.getElementsByTagName('a').length-1].href.replace("http://news.ycombinator.com/item?id=","");
    } catch (e) { main_id += document.location.href.replace("http://news.ycombinator.com/item?id=",""); }

    var main_user = subtext.getElementsByTagName('a')[0].text;
    var main_title = subtext.parentNode.previousSibling.getElementsByClassName('title')[0].getElementsByTagName('a')[0].text;

    var hackernews_comments = new Firebase('https://hackernews.firebaseIO.com/comments');
    var main_comments = hackernews_comments.child("thread-" + main_id); // hackernews_comments.child("long"); // hackernews_comments.child(main_id);
    
    main_comments.remove();

    var main_ref = main_comments.child(main_id);
    main_ref.set({name:main_user, comment:main_title});

    var comments = document.getElementsByClassName('comment');
    var parents = [];
    for (var i=0; i<comments.length; i++) {

      var comment_deleted = comments[i].parentNode.getElementsByClassName('comhead')[0].children.length == 0;

      var comment = comments[i].innerHTML;
      var comment_user = comment_deleted ? '[deleted]' : comments[i].parentNode.getElementsByClassName('comhead')[0].getElementsByTagName('a')[0].text;
      var comment_id = comment_deleted ? ("00" + i).slice(-3) + '-deleted-' + main_id : ("00" + i).slice(-3) + '-' + comments[i].parentNode.getElementsByClassName('comhead')[0].getElementsByTagName('a')[1].href.replace("http://news.ycombinator.com/item?id=","");;
      var comment_level = comments[i].parentNode.parentNode.getElementsByTagName('img')[0].width / 40;
      var comment_ref = main_comments.child(comment_id);

      parents[comment_level] = comment_id;
      
      comment_ref.set({name:comment_user, comment:comment});
      
      if (comment_level == 0) {
        main_ref.child("children").child(comment_id).set(true);
        comment_ref.child("parent").set(main_id);
        comment_ref.child("parents").child(main_id).set(true);
        main_ref.child("children_all").child(comment_id).set(true);
      } else {              
        main_comments.child(parents[comment_level-1]).child("children").child(comment_id).set(true);
        comment_ref.child("parent").set(parents[comment_level-1]);

        comment_ref.child("parents").child(main_id).set(true);
        main_ref.child("children_all").child(comment_id).set(true);
        for (var ii=0; ii<comment_level; ii++) {
          comment_ref.child("parents").child(parents[ii]).set(true);
          main_comments.child(parents[ii]).child("children_all").child(comment_id).set(true);
        }
      }
    }
  // } catch (e) {
  //   console.log("failed", e)
  // }

  // http://stackoverflow.com/a/10073761/202448
  // ("000" + i).slice(-3)
}
