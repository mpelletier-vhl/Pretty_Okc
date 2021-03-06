PrettyOkc.Favorites = (function() {
  function init() {
    remove_favorite_pagination();
  }

  function create_favorites_hover() {
    // Add one hover container for adding someone to multiple lists.
    $('.monolith').find('.favorites_list.favorites_page').remove();
    $('.monolith').append('<div class="favorites_list favorites_page hidden_helper"><span class="title">Add to List</span><ul class="favorites_hover"></ul></div>');

    var favorites_container = $('.favorites_list.favorites_page');

    // Populate the hover container with the lists.
    $.each(favorites_array, function(index, value) {
      var list = JSON.parse(value.list_name).replace(/"/g, '&quot;');
      $('ul.favorites_hover').append('<li class="list"><input type="checkbox" name="favorites" value="' + list + '"><span>' + list + '</span></li>');
    });

    if ($('ul.favorites_hover').find('li').length === 0) {
      $('ul.favorites_hover').append('<li>You have no custom lists.</li>');
    }

    set_favorite_mouseover();

    $('.action_favorite').click(function() {
      set_favorite_mouseover();
      if ($(this).hasClass('action_favorited')) {
        favorites_container.addClass('hidden_helper');
      }
    });

    function set_favorite_mouseover() {
      $('.action_favorite').unbind('mouseover');
      // Add the mouseover to display the favorite list hover.
      $('.action_favorite').mouseover(function() {
        if ($(this).hasClass('action_favorited')) {
          var username = $(this).attr('id');
          username = username.replace('action-box-', '').replace('-fav', '');
          var padding = 124;
          var offset = $(this).offset().top - padding;
          favorites_container.css('top', offset).removeClass('hidden_helper');
          reset_list_checks(username);
        }
      });

      favorites_container.mouseleave(function() {
        favorites_container.addClass('hidden_helper');
      });
    }

    function reset_list_checks(username) {
      unbind_list_toggle();
      var checked;

      $.each(favorites_array, function(index, value) {
        checked = ($.inArray(username, value.users) > -1);
        var parsed_name = JSON.parse(value.list_name);
        $('.list:contains("' + parsed_name + '")').find('input').prop('checked', checked);
      });

      bind_list_toggle(username)

      function bind_list_toggle(profile_name) {
        $('ul.favorites_hover').find('input').change(function() {
          var checked = this.checked;
          var this_list = $(this).val();

          if (checked) {
            add_name_to_list(profile_name, this_list);
          } else {
            remove_name_from_list(profile_name, this_list);
          }
        });
      }

      function unbind_list_toggle() {
        $('ul.favorites_hover').find('input').unbind('change');
      }
    }
  }

  function remove_favorite_pagination() {
    var last_page = $('.pages.clearfix');
    var pages = last_page.find('a.last').text();
    var pages_array = [];
    var defer_array = [];
    // Put all the pages into an array.
    // Also note that each page will have a defer. More on that later.
    for (var i = 2; i <= pages; i++) {
      pages_array.push(i);
      defer_array.push(new $.Deferred());
    }

    // Append our new container, and remove the pagination.
    last_page.before('<div class="additional_pages"></div>');
    last_page.remove();

    var i = 0;
    $.each(pages_array, function(index, value) {
      // Calculate the lowest numbered favorite.
      var starting_results = ((value - 1) * 25) + 1;
      $('.additional_pages').append('<div class="page_' + value + '"></div>');
      var page_container = $('.page_' + value);
      var url = 'http://www.okcupid.com/favorites?low=' + starting_results + ' #main_column';
      // Load in the content.
      page_container.load(url, function(response) {
        page_container.find('.pages.clearfix').remove();
        // Resolve the defer.
        defer_array[i].resolve();
        i++;
      });
    });

    // When all the defers are resolved, run the functions that affect each 
    // of the individual profile containers. 
    $.when.apply(null, defer_array).done(function() { 
      initialize_favorites_lists();
      PrettyOkc.Common.add_private_notes();
    });
  }

  function initialize_favorites_lists() {
    show_all_favorites();
    unbind_list_events();
    create_sidebar_html();

    PrettyOkc.Favorites.create_favorites_hover();

    bind_favorite_list_sortable();
    bind_favorite_list_toggle();
    bind_list_actions();

    $(window).scroll(check_scroll_top);
    create_scroll_top();

    function bind_favorite_list_sortable() {
      $(".favorites.sortable").sortable({
        helper: "clone",
        placeholder: "ui-state-highlight",
        cancel: ".disable-sort",
        update: function(ev, ui) {
          reorder_favorites(ui);
        }
      });
      $(".favorites.sortable").disableSelection();

      function reorder_favorites(ui) {
        var moved_list_name = $(ui.item).find('.list_name').text();
        moved_list_name = JSON.stringify(moved_list_name)
        var list_array = [];

        $('.favorites.sortable .list_name').each(function() {
          list_array.push(JSON.stringify($(this).text()));
        });

        var old_position;
        var new_position = $.inArray(moved_list_name, list_array);

        $.each(favorites_array, function(index, value) {
          if (moved_list_name === value.list_name) {
            old_position = index;
          }
        });

        PrettyOkc.Common.array_move(favorites_array, old_position, new_position);
        save_favorites();
        bind_favorite_list_toggle();
        bind_list_actions();
      }
    }

    function create_sidebar_html() {
      // Replace "About Favorites" text
      $('#right_bar').find('.body').html('<h2>About Favorites</h2><p>Use Favorites Lists to save people you like on OkCupid. These lists are private.</p>');

      // Add container for Favorite Lists
      $('#right_bar').find('.side_favorites').remove();
      $('#right_bar').append('<div class="side_favorites"><h2>Favorites Lists</h2><div class="favorites_lists"><ul class="favorites"><li class="favorite_list_all current">All</li><li class="favorite_list_none">Ungrouped</li></ul><ul class="favorites sortable"></ul></div><h2>Add New List</h2><div class="add_list"><input type="text" id="new_favorite_list" name="favorites" size="30"><span class="save_list">Save List</span></div></div>');

      // Add each favorite list
      $.each(favorites_array, function(index, value) {
        var list = JSON.parse(value.list_name);
        $('ul.favorites.sortable').append('<li class="favorite_list"><span class="list_name">' + list + '</span><span class="remove_list" title="Delete list">Delete List</span><span class="edit_list" title="Edit list name">Edit List Name</span></li>');
      });
    }

    function unbind_list_events() {
      $('.save_list').unbind("click");
      $('ul.favorites li').unbind("click");
      $('.remove_list').unbind("click");
      $('#edit_favorite_list').unbind("click");
      $('.update_list').unbind("click");
    }

    function bind_list_actions() {
      bind_new_list_link();
      bind_delete_list_link();
      bind_edit_list_link();

      function bind_new_list_link() {
        $('input#new_favorite_list').keypress(function(e) {
          if (e.keyCode == 13) {
            save_new_list();
          }
        });

        $('.save_list').click(function() {
          save_new_list();
        });

        $('input#new_favorite_list').keyup(function() {
          if ($(this).val().length > 20) {
            display_error('length');
          }
        });

        function save_new_list() {
          var new_list_name = $('#new_favorite_list').val();
          var length = 20;

          if (new_list_name === "") {
            display_error('blank');
          } else if (new_list_name.length > 25) {
            display_error('length');
          } else {
            if (new_list_name.length > length) {
              new_list_name = new_list_name.substring(0, length);
            }
            new_list_name = JSON.stringify(new_list_name);
            var new_list = {list_name: new_list_name, users: []}

            var unique = check_uniqueness(new_list_name);
            if (!unique) {
              display_error('unique');
            } else {
              favorites_array.push(new_list);
              save_favorites();
              initialize_favorites_lists();
            }
          }
        }
      }

      function bind_delete_list_link() {
        $('.remove_list').click(function() {
          var list = $(this).siblings('.list_name').text();
          var index_for_removal;

          $.each(favorites_array, function(index, value) {
            if (JSON.parse(value.list_name) === list) {
              index_for_removal = index;
            }
          });
          favorites_array.splice(index_for_removal, 1);
          save_favorites();
          initialize_favorites_lists();
        });
      }

      function bind_edit_list_link() {
        $('.edit_list').click(function(e) {
          // stopPropagation in here is to stop us from auto-focusing on the list.
          e.stopPropagation();

          // Disable sorting of lists while editing.
          $('.favorite_list').each(function() {
            $(this).addClass("disable-sort");
          });

          // If we are not already editing
          if ($('.edit_list_container').length === 0) {
            // Get the original name, as well as the list we are focused on.
            var original_name = $(this).siblings('.list_name').text();
            var current_focus = $('ul.favorites').find('.current').find('.list_name').text();

            replace_with_input($(this), original_name);
            bind_edit_clicks();
          }

          function replace_with_input(self, original_name) {
            self.addClass('hidden_helper');
            self.siblings('.list_name').addClass('hidden_helper');
            self.siblings('.remove_list').addClass('hidden_helper');

            self.parent().prepend('<div class="edit_list_container"><input type="text" id="edit_favorite_list" name="favorites" size="30" value="' + original_name + '"><span class="update_list" title="Update list name">Update</span></div>');
          }

          function bind_edit_clicks() {
            $('#edit_favorite_list').click(function(e) {
              e.stopPropagation();
            })

            $('#edit_favorite_list').keypress(function(e) {
              if (e.keyCode == 13) {
                e.stopPropagation();
                update_list();
              }
            });

            $('.update_list').click(function(e) {
              e.stopPropagation();
              update_list();
            });
          }

          function update_list() {
            var new_name = $('#edit_favorite_list').val();
            var length = 20;

            if (new_name.length > length) {
              new_name = new_name.substring(0, length);
            }

            // Resume sorting.
            $('.favorite_list').each(function() {
              $(this).removeClass("disable-sort");
            });

            // If there are changes.
            if (original_name !== new_name) {
              var unique = check_uniqueness(new_name);
              
              if (!unique) {
                // Display an error if not unique.
                display_uniqueness_error();
              } else {
                // Otherwise, update it in the array.
                $.each(favorites_array, function(index, value) {
                  if (JSON.parse(value.list_name) === original_name) {
                    value.list_name = JSON.stringify(new_name);
                  }
                });
                refresh_list(new_name);
              }
            } else {
              refresh_list(new_name);
            }
          }

          function refresh_list(new_name) {
            save_favorites();
            initialize_favorites_lists();
            // Stay on current list when we reinitialize the lists.
            if (!current_focus) {
              show_all_favorites();
              remove_current();
              $('.favorite_list_all').addClass('current');
            } else if (current_focus) {
              if (current_focus !== new_name) {
                show_selected_list(new_name);
                remove_current();
                $('li.favorite_list:contains(new_name)').addClass('current');
              } else {
                show_selected_list(current_focus);
                remove_current();
                $('li.favorite_list:contains(current_focus)').addClass('current');
              }
            }
          }
        });
      }

      function check_uniqueness(checked_name) {
        var unique = true;

        $.each(favorites_array, function(index, value) {
          if (value.list_name === checked_name) {
            unique = false;
          } 
        });

        return unique;
      }

      function display_error(type) {
        var message;
        var favorites_lists = $('.favorites_lists');

        if (type === "unique") {
          message = "List name must be unique";
        } else if (type === "blank") {
          message = "List name cannot be blank.";
        } else if (type === "length") {
          message = "List name must be less than 25 characters.";
        }

        if (favorites_lists.find('.oknotice_error').length === 0) {
          favorites_lists.append('<div class="oknotice_error unique">' + message + '</div>');
          setTimeout(function() {
            favorites_lists.find('.oknotice_error.unique').remove();
          }, 5000);
        }
      }
    }

    function bind_favorite_list_toggle() {
      $('ul.favorites li').click(function() {
        // Hide the favorite list hover just in case.
        $('.monolith').find('.favorites_list.favorites_page').addClass('hidden_helper');
        
        // Swap the "current" class.
        remove_current();
        $(this).addClass('current');
        
        if ($(this).hasClass('favorite_list_all')) {
          show_all_favorites();
        } else if ($(this).hasClass('favorite_list_none')) {
          show_ungrouped_favorites();
        } else {
          var list = $(this).find('.list_name').text();
          show_selected_list(list);
        }
      });
    }

    function remove_current() {
      $('li.favorite_list_all').removeClass('current');
      $('li.favorite_list_none').removeClass('current');
      $('li.favorite_list').each(function() {
        $(this).removeClass('current');
      });
    }

    function create_scroll_top() {
      $('.monolith').append('<a id="back_to_top" class="opensans fixed show hidden_helper" href="#"><span class="icon">Back to top</span></a>');
    }

    function check_scroll_top() {
      var offset = 200;
      if ($(window).scrollTop() > offset) {
        $('#back_to_top').removeClass('hidden_helper');
      } else {
        $('#back_to_top').addClass('hidden_helper');
      }
    }
  }

  function add_name_to_list(name, list) {
    name = name.replace('usr-', '');

    // If the name is unique, add it to the array for this particular list, and then save the list.
    $.each(favorites_array, function(index, value) {
      if (JSON.parse(value.list_name) === list) {
        if ($.inArray(name, value.users) < 0) {
          value.users.push(name);
          save_favorites();
        }
      }
    });
  }

  function remove_name_from_list(name, list) {
    name = name.replace('usr-', '');

    // Remove the name from this particular list and then save the list.
    $.each(favorites_array, function(index, value) {
      if (JSON.parse(value.list_name) === list) {
        if ($.inArray(name, value.users) > -1) {
          var index_for_removal = value.users.indexOf(name);
          value.users.splice(index_for_removal, 1);
          save_favorites();
        }
      }
    });
  }

  function save_favorites() {
    chrome.storage.sync.set({"favorites": favorites_array});
  }

  function show_all_favorites() {
    // Show every  user on the favorites list.
    $('.user_row_item').each(function() {
      $(this).removeClass('hidden_helper');
    });

    // Hide the link to remove from this list
    $('.user_row_item').each(function() {
      $(this).find('.action_remove_list').addClass('hidden_helper');
    });
  }

  function show_ungrouped_favorites() {
    // Get all the names that are on lists
    var listed_names = [];
    $.each(favorites_array, function(index, value) {
      listed_names.push(value.users);
    });

    // Show all the users.
    show_all_favorites();

    // Hide the users that are on lists.
    $.each(listed_names, function(index, value) {
      $.each(value, function(index, value) {
        $('#usr-' + value).addClass('hidden_helper');
      });   
    }); 

    // Hide the link to remove from this list
    $('.user_row_item').each(function() {
      $(this).find('.action_remove_list').addClass('hidden_helper');
    });
  }

  function show_selected_list(searched_list) {
    // Hide all the users.
    $('.user_row_item').each(function() {
      $(this).addClass('hidden_helper');
    });

    // Get all the users on this list 
    var names = [];
    $.each(favorites_array, function(index, value) {
      if (JSON.parse(value.list_name) === searched_list) {
        names = value.users;
      }
    });

    // Unhide these users
    $.each(names, function(index, value) {
      $('#usr-' + value).removeClass('hidden_helper');
    }); 

    // Show the "Remove from List" button
    $('.user_row_item').not('.hidden_helper').each(function() {
      $(this).find('.action_remove_list').removeClass('hidden_helper');
    });
  }

  return {
    init: init,
    create_favorites_hover: create_favorites_hover,
    save_favorites: save_favorites
  }
})();