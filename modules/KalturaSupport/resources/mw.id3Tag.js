( function( mw, $ ) {"use strict";

	mw.PluginManager.add( 'id3Tag', mw.KBasePlugin.extend({

        isSafeEnviornment: function () {
            if( this.getPlayer().isLive() && !this.getPlayer().isDVR() ){
                return true;
            }
            return false;
        },

		setup: function(){
			var _this = this;

			this.bind('onId3Tag', function(e, tag){
                var time;
                switch(_this.getPlayer().instanceOf){
                    case "Native":
                        time = JSON.parse(tag).timestamp / 1000;
                        break;
                    case "Kplayer":
                        //flash tag: {"id":"ac1d4fd80c79bf7807f6c33061833a784ff5ce62","timestamp":1.447225650123E12,"offset":1431918.0,"objectType":"KalturaSyncPoint"}
                        tag = tag.substring(tag.indexOf('{'), tag.length);
                        var timestamp = tag.match(/timestamp\"\:([0-9|\.|A-F]+)/);
                        time = parseFloat( timestamp[1] ) / 1000;

                        break;
                    case "splayer":

                        break;
                }

                _this.sendTrackEventMonitor(mw.seconds2npt(time));
                _this.getPlayer().setCurrentTime(time);
			});
		},

        sendTrackEventMonitor: function(time) {
            // Send the id3Tag info to the trackEventMonitor
            if( this.getConfig( 'trackEventMonitor' ) ) {
                try {
                    window.parent[this.getConfig('trackEventMonitor')](
                        "id3Tag plugin :: id3 tag | time = " + time
                    );
                } catch (e) {}
            }
            mw.log("id3Tag plugin :: id3 tag | time = " + time);
        }
	}));

} )( window.mw, window.jQuery );