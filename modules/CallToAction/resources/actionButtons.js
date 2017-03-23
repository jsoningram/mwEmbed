( function( mw, $ ) {"use strict";

mw.PluginManager.add( 'actionButtons', mw.KBaseScreen.extend({

	defaultConfig: {
		displayOnRelated: true,
		displayTime: "end",
		openInNewWindow: true,
		styles: {
			"bgColor": "#432ae7",
			"bgHoverColor": "#009E49",
			"textColor": "#ffffff",
			"textSize": "18px",
			"fontFamily": "Arial, Roboto, Arial Unicode Ms, Helvetica, Verdana, PT Sans Caption, sans-serif"
		},
		actions: {
			"button1": {
				"label": "button1",
				"labelMetadataField": "Button1label",
				"url": "http://www.kaltura.com",
				"urlMetadataField": "Button1url"
			},
			"button2": {
				"label": "button2",
				"labelMetadataField": "Button2label",
				"url": "http://player.kaltura.com",
				"urlMetadataField": "Button2url"
			}
		},
		templatePath: '../CallToAction/templates/action-buttons.tmpl.html'
	},

	setup: function() {

		// Handle custom configuration from entry custom data
		this.bind('KalturaSupport_EntryDataReady', $.proxy(function () {
			this.setActionsConfiguration();
		}, this));

		// Handle button styles for cta screen
		this.bind('preShowScreen', $.proxy(function(e, screenPluginName){
			if( screenPluginName === 'actionButtons' ) {
				this.getScreen().then($.proxy(function () {
					// Handle button styles
					this.setStyles();
				}, this));
			}
		}, this));

		// Check if we should add cta to related
		if ( this.getConfig('displayOnRelated') ) {
			this.bind('showScreen', $.proxy(function(e, screenPluginName){
				if( screenPluginName === 'related' ) {
					var $spans = this.getPlayer().getVideoHolder()
								.find('.related > .screen-content')
								.find('span');

					this.getTemplateHTML(this.getTemplateData())
						.then($.proxy(function (htmlMarkup) {
							$spans.eq(1).after(htmlMarkup);
							// Handle button styles for cta with related
							this.setStyles();
					},this));
				}
			}, this));
		}

		// Handle screen display timing
		if ( this.getConfig('displayTime' ) == "end") {
			this.bind('onEndedDone', $.proxy(function(){
				if (!this.getConfig('displayOnRelated')) {
					this.showScreen();
				}
			}, this));
		} else {
			this.bind('timeupdate', $.proxy(function(){
				if( Math.floor(this.getPlayer().currentTime) == this.getConfig('displayTime') ){
					this.showScreen();
				}
			}, this));
		}
	},

	setStyles: function () {
		var styles = this.getConfig('styles');
		this.getPlayer().getInterface().find(".cta-button").css({
			'background-color': styles.bgColor,
			'color': styles.textColor,
			'font-size': styles.textSize,
			'font-family': styles.fontFamily
		}).hover(function (e) {
			$(this).css('background-color', e.type === "mouseenter" ? styles.bgHoverColor : styles.bgColor )
		});
	},

	setActionsConfiguration: function () {
		if ( this.getPlayer().getFlashvars()["actions"] ){
			this.setConfig('actions', this.getPlayer().getFlashvars().actions)
		} else if ( this.getPlayer().kalturaEntryMetaData ) {
			this.setMetadataConfig();
		}
	},

	setMetadataConfig: function() {
		// Check if the entry has custom configuration
		var customConfig = this.getPlayer().kalturaEntryMetaData;
		var actions = this.getConfig('actions');
		var updatedConfig = {};

		$.each(actions, $.proxy(function( key, val ){
			updatedConfig[key] = {
				"label": customConfig[val["labelMetadataField"]],
				"url": customConfig[val["urlMetadataField"]]
			};
		}, this));

		this.setConfig('actions', updatedConfig)
	},

	getTemplateData: function() {
		return {
			actions: this.getConfig('actions')
		};
	},

	gotoAction: function(e, data) {
		var $a = $(e.target),
			data = {
				label: $a.text(),
				url: $a.attr('href')
			};

		// Trigger event for 3rd party plugins
		this.getPlayer().triggerHelper('actionButtonClicked', [data]);
		this.log('Trigger "actionButtonClicked" event with data: ', data);

		if( this.getConfig('openInNewWindow') || !mw.getConfig('EmbedPlayer.IsFriendlyIframe') ) {
			window.open( data.url );
		} else {
			window.parent.location.href = data.url;
		}
	}

}));

} )( window.mw, window.jQuery );