( function( mw, $ ) {"use strict";

	mw.PluginManager.add( 'playlistAPI', mw.KBaseMediaList.extend({

		defaultConfig: {
			'initItemEntryId': null,
			'autoContinue': true,
			'autoPlay': null,
			'kpl0Name': null,
			'kpl0Url': null,
			'kpl0Id': null,
			'includeInLayout': null,
			'parent': null,//'sideBarContainer',
			'mediaItemWidth': 290,
			'defaultPlaylistHeight': 290,
			'titleLimit': 30,
			'descriptionLimit': 60,
			'thumbnailWidth' : 50,
			'horizontalMediaItemWidth': 290,
			'includeThumbnail': true,
			'includeItemNumberPattern': false,
			'includeMediaItemDuration': true,
			'loop': false,
			'overflow': true,
			'selectedIndex': 0,
			'containerPosition':  'right'
		},

		// flag to store the current loading entry
		loadingEntry: null,
		// Flag for setting initial entry in first load
		firstLoad: true,

		currentClipIndex: null,
		playlistSet : [],

		getConfig: function( key ){
			return this.embedPlayer.getKalturaConfig( 'playlistAPI', key );
		},

		setup: function( embedPlayer ) {
			this.addBindings();
			this.loadPlaylists();
		},
		addBindings: function() {
			var _this = this;
			this.bind( 'playerReady', function ( e, newState ) {
				if (_this.playlistSet.length > 0){
					_this.prepareData(_this.playlistSet[0].items);
					_this.setMediaList(_this.playlistSet[0].items);
					// support initial selectedIndex
					if (_this.firstLoad){
						_this.setSelectedMedia(_this.getConfig('selectedIndex'));
						_this.playMedia( _this.getConfig('selectedIndex'), false);
						_this.firstLoad = false;
					}
				}
			});
		},

		mediaClicked: function(index){
			this.playMedia( index, true);
		},

		loadPlaylists: function(){
			var embedPlayer = this.embedPlayer;
			// Populate playlist set with kalturaPlaylistData
			for (var playlistId in embedPlayer.kalturaPlaylistData ) {
				if (embedPlayer.kalturaPlaylistData.hasOwnProperty(playlistId)) {
					this.playlistSet.push( embedPlayer.kalturaPlaylistData[ playlistId ] );
				}
			}
		},

		prepareData: function(itemsArr){
			for (var i = 0; i < itemsArr.length; i++){
				var item = itemsArr[i];
				var customData = item.partnerData ? JSON.parse(item.partnerData) :  {};
				var title = item.name || customData.title;
				var description = item.description || customData.desc;
				item.order = i;
				item.title = title;
				item.description = description;
				item.width = this.getConfig( 'mediaItemWidth' );
				item.durationDisplay = item.duration;
			}
			for (var j=itemsArr.length-1; j>=0; j--)
				itemsArr.push(itemsArr[j]);
		},

		getMedialistContainer: function(){
			this.$mediaListContainer =  $(".playlistInterface");

			// resize the video to make place for the playlist according to its position (left, top, right, bottom)
			if (this.getConfig('containerPosition') == 'right' || this.getConfig('containerPosition') == 'left'){
				$(".videoHolder, .mwPlayerContainer").css("width", this.$mediaListContainer.width() - this.getConfig("mediaItemWidth") +"px");
			}
			if (this.getConfig('containerPosition') == 'left'){
				$(".mwPlayerContainer").css({"margin-left": this.getConfig("mediaItemWidth") +"px", "float": "right"});
			}
			if (this.getConfig('containerPosition') == 'top' || this.getConfig('containerPosition') == 'bottom'){
				$(".videoHolder, .mwPlayerContainer").css("height", this.$mediaListContainer.height() - this.getConfig("defaultPlaylistHeight") +"px");
			}
			return this.$mediaListContainer;
		},

		setMedialistContainerSize: function(){
			// resize the video to make place for the playlist according to its position (left, top, right, bottom)
			if (this.getConfig('containerPosition') == 'right' || this.getConfig('containerPosition') == 'left'){
				$(".medialistContainer").width(this.getConfig("mediaItemWidth"));
				$(".medialistContainer").height("100%");
				$(".medialistContainer").css("position","absolute");
			}
			if (this.getConfig('containerPosition') == 'right'){
				$(".medialistContainer").css("float","right");
				$(".mwPlayerContainer").css("float","left");
			}
			if (this.getConfig('containerPosition') == 'top' || this.getConfig('containerPosition') == 'bottom'){
				$(".medialistContainer").height(this.getConfig("defaultPlaylistHeight"));
				$(".medialistContainer").css("display","block");
			}
			return this.$mediaListContainer;
		},

		playMedia: function(clipIndex, autoplay){
			var autoPlay = (autoplay === true);
			this.currentClipIndex = clipIndex; // save clip index for next / previous calls
			var embedPlayer = this.embedPlayer;

			var _this = this;
			var id = _this.mediaList[clipIndex].id;
			if( !embedPlayer ){
				mw.log("Error: Playlist:: playClip called with null embedPlayer ");
				return ;
			}

			// iOS devices have a autoPlay restriction, we issue a raw play call on
			// the video tag to "capture the user gesture" so that future
			// javascript play calls can work
			if( embedPlayer.getPlayerElement() && embedPlayer.getPlayerElement().load ){
				mw.log("Playlist:: issue load call to capture click for iOS");
				embedPlayer.getPlayerElement().load();
			}

			// Send notifications per play request
			if( clipIndex == 0 ) {
				embedPlayer.triggerHelper( 'playlistFirstEntry' );
			} else if( clipIndex == (this.mediaList.length-1) ) {
				embedPlayer.triggerHelper( 'playlistLastEntry' );
			} else {
				embedPlayer.triggerHelper( 'playlistMiddleEntry' );
			}

			// Check if entry id already matches ( and is loaded )
			if( embedPlayer.kentryid == id ){
				if( this.loadingEntry ){
					mw.log("Error: PlaylistAPI is loading Entry, possible double playClip request");
					return ;
				}else {
					if (autoPlay){
						embedPlayer.play();
					}
				}
			}

			// Update the loadingEntry flag:
			this.loadingEntry = id;
			var originalAutoPlayState = embedPlayer.autoplay;

			// Listen for change media done
			var bindName = 'onChangeMediaDone' + this.bindPostFix;
			$( embedPlayer).unbind( bindName ).bind( bindName, function(){
				mw.log( 'mw.PlaylistHandlerKaltura:: onChangeMediaDone' );
				_this.loadingEntry = false;
				// restore autoplay state:
				embedPlayer.autoplay = originalAutoPlayState;
				if (autoPlay){
					embedPlayer.play();
				}
			});
			mw.log("PlaylistHandlerKaltura::playClip::changeMedia entryId: " + id);

			// Make sure its in a playing state when change media is called if we are autoContinuing:
			if( this.getConfig('autoContinue') && !embedPlayer.firstPlay ){
				embedPlayer.stopped = embedPlayer.paused = false;
			}
			// set autoplay to true to continue to playback:
			embedPlayer.autoplay = autoPlay;

			// Use internal changeMedia call to issue all relevant events
			embedPlayer.sendNotification( "changeMedia", {'entryId' : id, 'playlistCall': true} );

			// Add playlist specific bindings:
			_this.addClipBindings(clipIndex);

			// Restore onDoneInterfaceFlag
			embedPlayer.onDoneInterfaceFlag = true;
		},

		playNext: function(){
			if (this.currentClipIndex != null && this.currentClipIndex < this.mediaList.length-1){
				this.currentClipIndex++;
				this.setSelectedMedia(this.currentClipIndex);
				this.playMedia(this.currentClipIndex, true);
			}
		},

		playPrevious: function(){
			if (this.currentClipIndex != null && this.currentClipIndex > 0){
				this.currentClipIndex--;
				this.setSelectedMedia(this.currentClipIndex);
				this.playMedia(this.currentClipIndex, true);
			}
		},

		addClipBindings: function( clipIndex ){
			var _this = this;
			mw.log( "Playlist::addClipBindings" );

			var embedPlayer = _this.embedPlayer;
			// Setup ondone playing binding to play next clip (if autoContinue is true )
			if( _this.getConfig("autoContinue") == true ){
				$( embedPlayer ).unbind( 'postEnded').bind( 'postEnded', function(event ){
					mw.log("Playlist:: postEnded > on inx: " + clipIndex );
					_this.playNext();
				});
			}

			$( embedPlayer ).bind( 'playlistPlayPrevious' + this.bindPostfix, function() {
				_this.playPrevious();
			});

			$( embedPlayer ).bind( 'playlistPlayNext' + this.bindPostfix, function() {
				_this.playNext();
			});
		}
/*
		// add bindings for playlist playback ( disable playlist item selection during ad Playback )
		addPlaylistAdBindings: function(){
			var _this = this;
			var embedPlayer = this.embedPlayer;
			$( embedPlayer ).bind('AdSupport_StartAdPlayback' + this.bindPostfix, function(){
				_this.blockPlaylist();
			});
			$( embedPlayer ).bind('AdSupport_EndAdPlayback' + this.bindPostfix, function(){
				_this.restorePlaylist();
			});
		},
		blockPlaylist: function(){
			var _this = this;
			var embedPlayer = this.embedPlayer;
			// Add the Disable clip switch flag:
			_this.enableClipSwitch = false;

			// Add a gray overlay
			var $listwrap = this.$target.find( '.video-list-wrapper' );
			var cssPops = ['width','height', 'position', 'bottom', 'right', 'left', 'top'];
			var cssObj = {};

			// Copy in all the settings:
			$.each( cssPops, function(inx, prop){
				cssObj[ prop ] = $listwrap.css(prop);
			});
			// make sure we are not in fullscreen ( and there is nothing to cover up )
			if( ! this.$target.find( '.playlist-block-list' ).length ){
				$listwrap.before(
					$('<div />').css( cssObj )
						.addClass('playlist-block-list')
						.css({
							'z-index': 2,
							'background-color' : '#FFF',
							'opacity' : '0.7',
							'filter' : 'alpha(opacity=70)'
						})
						.click(function(){
							// don't let event propagate
							return false;
						})
				);
			}
			// if in fullscreen hide the listwrap
			if( embedPlayer.layoutBuilder.isInFullScreen() ){
				_this.$target.find( '.playlist-block-list' ).hide();
			}
		},
		restorePlaylist: function(){
			// Restore clip switch:
			this.enableClipSwitch = true;
			this.$target.find( '.playlist-block-list' ).remove();
		},

		playNext: function(clipIndex) {
			var _this = this;
			if( _this.enableClipSwitch &&  (clipIndex + 1) < _this.mediaList.length && (clipIndex + 1) <= parseInt( mw.getConfig( 'Playlist.MaxClips' ) ) ){
				_this.playClip( clipIndex+1 );
				return ;
			}
			mw.log( "Error: mw.playlist can't next: current: " + _this.clipIndex );
		},

		playPrevious: function(clipIndex) {
			var _this = this;
			if( _this.enableClipSwitch && clipIndex - 1 >= 0 ){
				_this.playClip( clipIndex-1 );
				return ;
			}
			mw.log("Cant prev: cur:" + clipIndex-1 );
		}*/

	})

	);

} )( window.mw, window.jQuery );