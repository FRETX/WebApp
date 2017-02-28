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

  songlist  = new Songlist(null, 'api/v1/mysongs');

  //PunchEditorr = new PunchEditor( id('puncheditor_container') );

  //songlist.ev_sub('list_loaded', function()     { load_song( songlist.random ); } );
  songlist.ev_sub('selected',    function(song) { load_song( song ); modal.hide(); } );

  timeline.on_scrub  = function(time_s)      { ytplayer.current_time = time_s; } 
  timeline.get_color = function(chord_label) { return palette.get_color(chord_label); } 

  ytplayer.on_time_change( timeline.update_time   );
  ytplayer.on_time_change( punchlist.update_time  );
  ytplayer.on_time_change( ctrlbar.on_time_change );
  ytplayer.on_video_data( on_video_data );
  ytplayer.on_video_data( show_published_or_unpublished );
  ytplayer.ev_sub( 'duration', timeline.set_duration );
  
  palette.ev_sub( 'selected', add_chord_now );
  palette.ev_sub( 'get_chord', picker.get_new_chord );

  punchlist.ev_sub( 'list_changed', timeline.load );
  punchlist.ev_sub( 'current_punch_changed', current_punch_changed );
  punchlist.ev_sub( 'current_punch_changed', ctrlbar.on_punch_change );
  //punchlist.ev_sub( 'current_punch_changed', puncheditor.on_punch_change );

  addvid.ev_sub( 'add_video', load_new_song );

});

/////////////////////////////////////////////// SETUP /////////////////////////////////////////////////////////

function remove_facebook_redirect_hash() {
  history.pushState("", document.title, window.location.pathname);
}

function load_new_song(url_or_id) {
  modal.hide();
  palette.clear();
  punchlist.clear();
  ytplayer.load(url_or_id);

}

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

function show_drop_down() {
  $('#meta-data').empty();
  $('#meta-data').append('<li><input type="text" id="artist" placeholder="Artist" class="form-control form-group" value="' +
                         (ytplayer.videodata.song.artist == null ? '' : ytplayer.videodata.song.artist) + '" required></input></li>' +
                         '<li><input type="text" id="title" placeholder="Title" class="form-control form-group" value="' +
                         (ytplayer.videodata.song.title == null ? '' : ytplayer.videodata.song.title) + '" required></input></li>' +
                         '<li><select id="genre" class="form-control form-group selectpicker"></select></li>' +
                         '<li><select id="difficulty" class="form-control form-group selectpicker"></select></li>' +
                         '<li><a id="btn-publish" class="btn btn-white" onclick="publish_song()">Publish</a></li>');
  $.get({
    url: "/api/v1/autocompletes/get_select_data.json",
    beforeSend: function(xhr) {xhr.setRequestHeader("Accept", "text/javascript")}
  }).done(function( data ) {
    if (data != null) {
      keys = Object.keys(data)
      keys.forEach(function(key, key_index){
        $('#'+key).empty();
        $('#'+key).append($('<option>', { text: 'Select '+key}))
        data[key].forEach(function(obj, id){
          $('#'+key).append($('<option>', { value: obj.id, text: obj.name }));
        })
      })
      $('#genre option[value='+ ytplayer.videodata.song.genre_id +']').prop('selected', true);
      $('#difficulty option[value='+ ytplayer.videodata.song.difficulty_id +']').prop('selected', true);
    }
  });
}

function publish_song() {
  var songdata = {
    youtube_id: ytplayer.videodata.id,
    title:      $('#title').val(),
    artist:     $('#artist').val(),
    genre:      $('#genreSelect').val(),
    difficulty: $('#diffSelect').val(),
    chords:     punchlist.to_models()
  }
  $.post('/api/v1/add.json', JSON.stringify(songdata) )
  .done( function()     { swal("Success!", "Upload Successful!", "success"); songlist.fetch(); } )
  .fail( function(resp) { swal("Upload Failed!", resp.responseText, "error"); } );
}

function show_published_or_unpublished() {
  if(ytplayer.videodata.song.publish) {
    $('#publish').hide();
    $('#unpublish').show();
  } else {
    $('#unpublish').hide();
    $('#publish').show();
  }
}
//////////////////////////////////////// CLICK LISTENERS ///////////////////////////////////////////////////////