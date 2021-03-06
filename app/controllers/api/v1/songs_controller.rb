class Api::V1::SongsController < Api::ApiController

  before_action :authenticate_user!, only: [:mysongs, :add, :update_songs_metadata]

  def index
    songs = Song.order(
              :youtube_id,
              uploaded_on: :DESC
            ).all
    songs = songs.collect { |s| s.to_hash(false) }

    success_response(songs)
  end

  def show
    song =  Song.where(
              youtube_id: params[:youtube_id],
              id: params[:id]
            ).first

    unless song.blank?
      song = song.to_hash
    end
    success_response(song)
  end

  def mysongs
    song = Song.select(
      'DISTINCT ON(youtube_id) id,
      uploaded_on,
      youtube_id,
      song_title,
      punches,
      published'
      ).where(
        uploaded_by: current_user.id
      ).order(
        :youtube_id,
        uploaded_on: :DESC
    )

    success_response(song.first)
  end

  def list
    songs = Song.select(
      'id,
      youtube_id,
      youtube_id || id as fretx_id,
      uploaded_on,
      song_title,
      punches,
      genre_id,
      difficulty_id,
      published',
    ).order(
      :youtube_id,
      uploaded_on: :DESC
    ).first(10)

    success_response(songs)
  end

  def add
    response = {}
    data = JSON.parse(request.body.read)
    song = Song.find_by_id(data['id'])
    song = Song.new(
      uploaded_by: current_user.id,
      youtube_id: data['youtube_id']
    ) if song.blank?
    unless song.published
      song.song_title    = data['title']
      song.punches       = data['chords']
      song.artist        = data['artist']
      song.genre_id      = data['genre']
      song.difficulty_id = data['difficulty']
      song.published     = true
      response[:message] = "Song Published!"
    else
      song.published = false
      response[:message] = "Song Unpublished!"
    end

    response[:message] = song.save ? response[:message] : song.errors.full_messages

    success_response(response)
  end

  def save_song
    response = {}
    data = JSON.parse(request.body.read)
    song = Song.find_by_id(data['id'])
    song = Song.new(
      uploaded_by: current_user.id,
      youtube_id: data['youtube_id']
    ) if song.blank?
    unless song.published
      song.punches       = data['chords']
      response[:message] = "Song Saved!"
    end

    response[:message] = song.save ? response[:message] : song.errors.full_messages

    success_response(response)
  end

  def get_related_songs
    song = Song.find_by_youtube_id(params[:youtube_id])
    related_songs = Song.where.not(id: song.id).where('genre_id = ? OR difficulty_id = ?', song.genre_id, song.difficulty_id) rescue []
    success_response(related_songs)
  end

  def get_searched_song
    conditions = []
    if params[:title]
      conditions[0] = "published = ?"
      conditions << true
      conditions[0] = conditions[0] + ' and (lower(song_title) like ? or lower(artist) like ?)'
      conditions << "%#{params[:title].downcase}%"
      conditions << "%#{params[:title].downcase}%"
      if params[:genre].to_i > 0
        conditions[0] = conditions[0] + ' and genre_id = ?'
        conditions << params[:genre]
      end
      if params[:difficulty].to_i > 0
        conditions[0] = conditions[0] + ' and difficulty_id = ?'
        conditions << params[:difficulty]
      end
    end
    songs = Song.select(
              :id,
              :youtube_id,
              :uploaded_on,
              :youtube_id,
              :song_title,
              :artist,
              :punches
            ).where(
              conditions
            ).order(
              uploaded_on: :DESC
            ).first(10)
    regexp = /#{params[:title].downcase}/i;
    songs = songs.sort{ |x, y| (x.song_title =~ regexp) <=> (y.song_title =~ regexp) }
    success_response(songs)
  end

  def get_promotion_video
    data = {}
    song = Song.select(
      'DISTINCT ON(youtube_id) id,
      uploaded_on,
      youtube_id,
      title,
      artist,
      punches'
    ).where(promotion: true).order(:youtube_id, updated_at: :desc).first
    data[:video_id] = song ? song.youtube_id : Song.first.try(:youtube_id)
    success_response(data)
  end
end