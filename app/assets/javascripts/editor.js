data = {
  songs: []
}

/////////////////////////////////////////////// SETUP /////////////////////////////////////////////////////////

$(document).ready(function() {
  
  remove_facebook_redirect_hash();

  punchlist = new Punchlist();
  chordlib  = new Chordlib();
  
  modal     = new Modal();
  addvid    = new AddVid();

  userview    = new UserView(   id('userview_container')  );
  ytplayer    = new YTPlayer(   id('ytplayer_container')  );
  fretboard   = new Fretboard(  id('fretboard_container') );
  ctrlbar     = new Controlbar( id('ctrlbar_container')   );
  timeline    = new Timeline(   id('timeline_container')  );
  palette     = new Palette(    id('palette_container')   );
  picker      = new chordpicker();

  songlist  = new Songlist(null, '/api/v1/mysongs');

  id('add_new_song').addEventListener('keypress', function (e){
    var key = e.which || e.keyCode;
    if (key === 13) {
      var yt_url = $('#add_new_song').val();
      var match = ytplayer.url_regex.exec(yt_url);
      if(!match && yt_url.length != 11) {
        swal("Syntax Not Match!", "Url is not valid!", "error");
      } else {
          var video_id = yt_url.length == 11 ? yt_url : match[1];
          $('#add_new_song').val(video_id);
          $('#create_new').attr('action', '/create_new_song');
          $('#create_new').attr('method', 'post');
          $('#create_new').submit();
      }
    }
  })


  //PunchEditorr = new PunchEditor( id('puncheditor_container') );

  //songlist.ev_sub('list_loaded', function()     { load_song( songlist.random ); } );
  songlist.ev_sub('selected',    function(song) { load_song( song ); modal.hide(); } );

  timeline.on_scrub  = function(time_s)      { ytplayer.current_time = time_s; } 
  timeline.get_color = function(chord_label) { return palette.get_color(chord_label); } 

  ytplayer.on_time_change( timeline.update_time   );
  ytplayer.on_time_change( punchlist.update_time  );
  ytplayer.on_time_change( ctrlbar.on_time_change );
  ytplayer.on_video_data( on_video_data );
  // ytplayer.on_video_data( show_published_or_unpublished );
  ytplayer.ev_sub( 'duration', timeline.set_duration );
  
  palette.ev_sub( 'selected', add_chord_now );
  palette.ev_sub( 'get_chord', picker.get_new_chord );

  punchlist.ev_sub( 'list_changed', timeline.load );
  punchlist.ev_sub( 'current_punch_changed', current_punch_changed );
  punchlist.ev_sub( 'current_punch_changed', ctrlbar.on_punch_change );
  //punchlist.ev_sub( 'current_punch_changed', puncheditor.on_punch_change );

  addvid.ev_sub( 'add_video', load_new_song );

  add_zoom_buttons();

  //   window.fbAsyncInit = function() {
  //   FB.init({
  //     appId      : '263883587393132',
  //     xfbml      : true,
  //     version    : 'v2.8'
  //   });
  //   FB.AppEvents.logPageView();
  // };

  // (function(d, s, id){
  //    var js, fjs = d.getElementsByTagName(s)[0];
  //    if (d.getElementById(id)) {return;}
  //    js = d.createElement(s); js.id = id;
  //    js.src = "//connect.facebook.net/en_US/sdk.js";
  //    fjs.parentNode.insertBefore(js, fjs);
  //  }(document, 'script', 'facebook-jssdk'));
  
});

/////////////////////////////////////////////// SETUP /////////////////////////////////////////////////////////

function remove_facebook_redirect_hash() {
  history.pushState("", document.title, window.location.pathname);
}

function add_zoom_buttons() {
  if($('#zoom-btn').length == 0) {
    $('#timeline_container').append('<div id="zoom-btn"></div>');
    $('#zoom-btn').append('<div class="zoom"><img src="/zoom_in.png" onclick="zoom_in()"></div>' +
                          '<div class="zoom"><img src="/zoom_out.png" onclick="zoom_out()"></div>' +
                          '<div id="save-btn"><a onclick="save_song()"><i class="glyphicon glyphicon-floppy-disk"></i></a></div>');
  }
}

function zoom_in(){
  if(timeline.state.zoom < 2) {
    timeline.state.zoom += 0.25;
    timeline.render();
  }
}

function zoom_out(){
  if(timeline.state.zoom > 0.25) {
    timeline.state.zoom -= 0.25;
    timeline.render();
  }
}

function load_new_song(url_or_id) {
  modal.hide();
  palette.clear();
  punchlist.clear();
  ytplayer.load(url_or_id);

}

// function add_new_song(){
//   youtube_url = $('#add_new_song').val()
//   ytplayer.load(youtube_url);
// }

function load_song(song) {
  fretboard.reset();
  var punches = [];
  for(var i=0; i<song.punches.length; i++) {
    punches.push( new Punch(song.punches[i].time, song.punches[i].chord) );
  }
  punchlist.load(punches);
  palette.load(punches);
  ytplayer.load(song.youtube_id);
}

function on_video_data() {
  punchlist.update_time(0);
}

function current_punch_changed(punch) {
  fretboard.load_chord(chordlib.get_chord(punch.chord));
  palette.highlight_chord(punch.chord);
}

function add_chord_now(chord) {
  console.log(chord);
  punchlist.add_punch( { time: ytplayer.current_time , chord: chord.label } );
} 


//////////////////////////////////////// CLICK LISTENERS ///////////////////////////////////////////////////////


function to_player() {
  window.location = '/';
}

function edit_menu() {
  modal.show(songlist.dom);
}

function open_new() {
  addvid.reset();
  modal.show(addvid.dom)
}

function create_new_song() {
  addvid.reset();
  modal.show(addvid.dom)
}

// function show_drop_down() {
//   $('#meta-data').empty();
//   $('#meta-data').append('<li><input type="text" id="artist" placeholder="Artist" class="form-control form-group" value="' +
//                          (ytplayer.videodata.song.artist == null ? '' : ytplayer.videodata.song.artist) + '" required></input></li>' +
//                          '<li><input type="text" id="title" placeholder="Title" class="form-control form-group" value="' +
//                          (ytplayer.videodata.song.title == null ? '' : ytplayer.videodata.song.title) + '" required></input></li>' +
//                          '<li><select id="genre" class="form-control form-group selectpicker"></select></li>' +
//                          '<li><select id="difficulty" class="form-control form-group selectpicker"></select></li>' +
//                          '<li><a id="btn-publish" class="btn btn-white" onclick="publish_song()">Publish</a></li>');
//   $.get({
//     url: "/api/v1/autocompletes/get_select_data.json",
//     beforeSend: function(xhr) {xhr.setRequestHeader("Accept", "text/javascript")}
//   }).done(function( data ) {
//     if (data != null) {
//       keys = Object.keys(data)
//       keys.forEach(function(key, key_index){
//         $('#'+key).empty();
//         $('#'+key).append($('<option>', { text: 'Select '+key}))
//         data[key].forEach(function(obj, id){
//           $('#'+key).append($('<option>', { value: obj.id, text: obj.name }));
//         })
//       })
//       $('#genre option[value='+ ytplayer.videodata.song.genre_id +']').prop('selected', true);
//       $('#difficulty option[value='+ ytplayer.videodata.song.difficulty_id +']').prop('selected', true);
//     }
//   });
// }

function publish_song() {
  if($('#title').val() != '' && $('#artist').val() != '' && $('#genreSelect').val() != '' && $('#diffSelect').val() != '') {
    var songdata = {
      youtube_id: ytplayer.videodata.id,
      title:      $('#title').val(),
      artist:     $('#artist').val(),
      genre:      $('#genreSelect').val(),
      difficulty: $('#diffSelect').val(),
      chords:     punchlist.to_models(),
      id:         $('#song_id').val()
    }
    $.post('/api/v1/add.json', JSON.stringify(songdata) )
    .done( function(resp)     { swal("Success!", resp.message, "success"); songlist.fetch(); toggle_pub_button(); } )
    .fail( function(resp) { swal("Upload Failed!", resp.message, "error"); } );
  } else {
    swal("Error", 'Please fill Title, Artist, Genre and Difficulty', "error");
  }
}

function save_song() {
  var songdata = {
    youtube_id: ytplayer.videodata.id,
    chords:     punchlist.to_models(),
    id:         $('#song_id').val()
  }
  $.post('/api/v1/save_song.json', JSON.stringify(songdata) )
  .done( function(resp)     { swal("Success!", resp.message, "success"); songlist.fetch(); } )
  .fail( function(resp) { swal("Upload Failed!", resp.message, "error"); } );
}

function toggle_pub_button() {
  if($('#pub_btn').contents().last()[0].textContent.trim() == 'Publish')
    $('#pub_btn').contents().last()[0].textContent = 'Unpublish';
  else
    $('#pub_btn').contents().last()[0].textContent = 'Publish';

  if($('.publish-text')[0].textContent.trim() == 'Publish')
    $('.publish-text')[0].textContent = 'Unpublish'
  else
    $('.publish-text')[0].textContent = 'Publish'
}

// function show_published_or_unpublished() {
//   if(ytplayer.videodata.song.publish) {
//     $('#publish').hide();
//     $('#unpublish').show();
//   } else {
//     $('#unpublish').hide();
//     $('#publish').show();
//   }
// }
//////////////////////////////////////// CLICK LISTENERS ///////////////////////////////////////////////////////