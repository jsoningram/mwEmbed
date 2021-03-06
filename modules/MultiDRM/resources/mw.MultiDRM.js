(function (mw, $) {
	"use strict";
	var multiDrm = mw.KBasePlugin.extend({

		setup: function () {
			//If both FPS certificate is available and FPS is supported then
			//use hls on native html5 video tag and FPS plugin will handle DRM flow
			var _this = this;
			var player = this.getPlayer();
			var cert = this.getFpsCertificate(player);
			if (mw.isNativeApp()){
				this.setupNativeDrm();
			} else if (cert && mw.isDesktopSafari()) {
				mw.log("Loading HLS FPS player");
				$(mw).bind('EmbedPlayerUpdateMediaPlayers', function (event, mediaPlayers) {
					mediaPlayers.removeMIMETypePlayers('video/playreadySmooth', 'Silverlight');
					mediaPlayers.removeMIMETypePlayers('video/ism', 'Silverlight');
				});
				// if we are loading FPS we need to wait until module is loaded then use asyncInit
				this.asyncInit = true;
				this.loadHlsFpsHandler().then(function () {
					mw.fps = new mw.FPS(player, function () {
						_this.initCompleteCallback();
					}, "FPS");
				});
			} else if (this.isCastLabsNeeded()) {
				this.registerCastLabsPlayer();
			}
		},

		isCastLabsNeeded: function () {
			return (mw.isChrome() && !mw.isMobileDevice()) || mw.isEdge() || //for smoothStream over dash
				((this.MSEunsupported() || mw.isDesktopSafari()) && this.getConfig("forceDASH"));  //for dash over silverLight
		},

		MSEunsupported: function () {
			return mw.isIE8() || mw.isIE9() || mw.isIE10Comp() ||
				  (mw.isIE11() && (mw.getUserOS() === 'Windows 7' || mw.getUserOS() === 'Windows 8'));
		},

		getFpsCertificate: function (embedPlayer) {
			var cert = null;
			if (window.kWidgetSupport) {
				cert = window.kWidgetSupport.getFairplayCert({contextData: embedPlayer.kalturaContextData});
			}
			return cert;
		},

		loadHlsFpsHandler: function () {
			var deferred = $.Deferred();
			mw.load(['mw.FPS'], function () {
				deferred.resolve();
			});
			return deferred;
		},

		registerCastLabsPlayer: function () {
			var _this = this;
			$(mw).bind('EmbedPlayerUpdateMediaPlayers', function (event, mediaPlayers) {
				mw.log("Register CastLabs player and extensions");

				_this.setEmbedPlayerConfig(_this.getPlayer());

				var multiDRMProtocols = ["video/ism", "video/playreadySmooth"];
				if ((_this.MSEunsupported() || mw.isDesktopSafari()) &&
					_this.getConfig("forceDASH")) {
					multiDRMProtocols.push("application/dash+xml");
				}

				var multiDRMPlayer = new mw.MediaPlayer('multidrm', multiDRMProtocols, 'MultiDRM');
				mediaPlayers.addPlayer(multiDRMPlayer);

				$.each(multiDRMProtocols, function (inx, mimeType) {
					if (mediaPlayers.defaultPlayers[mimeType]) {
						mediaPlayers.defaultPlayers[mimeType].unshift('MultiDRM');
						return true;
					}
					mediaPlayers.defaultPlayers[mimeType] = ['MultiDRM'];
				});
			});
		},

		setupNativeDrm: function(){
			mw.log("Loading Native SDK DRM");
			var _this = this;
			var nativeSdkDRMTypes = window.kNativeSdk && window.kNativeSdk.drmFormats;
			var nativeSdkAllTypes = window.kNativeSdk && window.kNativeSdk.allFormats;
			$(mw).bind('EmbedPlayerUpdateMediaPlayers', function (event, mediaPlayers) {
				$.each(nativeSdkAllTypes, function(i, nativeSdkType){
					mediaPlayers.removeMIMETypePlayers(nativeSdkType, 'NativeComponent');
				});
				$.each(nativeSdkDRMTypes, function(i, nativeSdkDRMType){
					mediaPlayers.setMIMETypePlayers(nativeSdkDRMType, 'NativeComponent');
				});
				if (kWidget.isIOS()) {
					var sources = _this.getPlayer().getSources();
					var hlsIndex = sources.findIndex(function(src) {return src.mimeType === "application/vnd.apple.mpegurl";});
					var wvmIndex = sources.findIndex(function(src) {return src.mimeType === "video/wvm";});
					if (hlsIndex >= 0) {
						if (sources[hlsIndex].fpsCertificate) {
							// FPS is supported and configured, remove WVM
							if (wvmIndex >= 0) {
								mediaPlayers.removeMIMETypePlayers("video/wvm", 'NativeComponent');
							}
						}
					} else {
						// FPS is supported by the platform, but not configured in the backend -- remove it.
						mediaPlayers.removeMIMETypePlayers("application/vnd.apple.mpegurl", 'NativeComponent');
					}
				}
			});
		},

		setEmbedPlayerConfig: function (embedPlayer) {
			//Get user configuration
			var drmUserConfig = embedPlayer.getKalturaConfig("multiDrm");
			//Get default config
			var drmConfig = this.getDefaultDrmConfig(embedPlayer.kpartnerid);
			//Deep extend custom config
			$.extend(true, drmConfig, drmUserConfig);
			embedPlayer.setKalturaConfig("multiDrm", drmConfig);
			return drmConfig;
		},

		getDefaultDrmConfig: function (partnerId) {
			var defaultConfig = {
				"drm": "auto",
				"customData": {
					"userId": partnerId,
					"sessionId": "castlab-session",
					"merchant": "kaltura"
				},
				"sendCustomData": false,
				"generatePSSH": false,
				"authenticationToken": null,
				"widevineLicenseServerURL": null,
				"playReadyLicenseServerURL": null,
				"accessLicenseServerURL": null,
				"flashFile": mw.getConfig("EmbedPlayer.dashAsUrl") || mw.getMwEmbedPath() + "node_modules/mwEmbed-Dash-Everywhere/dashas/dashas.swf",
				"silverlightFile": mw.getConfig("EmbedPlayer.dashCsUrl") || mw.getMwEmbedPath() + "node_modules/mwEmbed-Dash-Everywhere/dashcs/dashcs.xap",
				"techs": ( mw.isFirefox() || mw.isDesktopSafari() ) ? ["dashcs"] : ["dashjs", "dashcs"],
				"debug": false
			};
			return defaultConfig;
		}
	});

	mw.PluginManager.add('multiDrm', multiDrm);

})(window.mw, window.jQuery);