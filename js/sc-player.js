/*
*   SoundCloud Pure Player
*   
*   The project to rewrite https://github.com/soundcloud/soundcloud-custom-player ((c) Matas Petrikas, MIT)
*   on a pure js code.
*   Original project source code:
*   https://github.com/OpenA/soundcloud-pure-player
*
*   Usage:
*   <a href="https://soundcloud.com/ueffin-chatlan/reminiscences" class="sc-player">My new dub track</a>
*   The link will be automatically replaced by the HTML based player
*/

function SoundCloudAPI() {
	Object.defineProperties(this, {
		version: {
			enumerable: true,
			value: '1.0'
		},
		apiKey: {
			enumerable: true,
			writable: true,
			value: 'htuiRd1JP11Ww0X72T1C3g'
		},
		debug: {
			enumerable: true,
			writable: true,
			value: true
		}
	});
}

SoundCloudAPI.prototype = {
	constructor : SoundCloudAPI,
	getTrackInfo: function(url, callback) {
		if (!url || typeof callback !== 'function') {
			return;
		}
		
		var protocol = (document.location.protocol === 'https:' ? 'https:' : 'http:'),
			resolve = protocol +'//api.soundcloud.com/resolve?url=',
			params = 'format=json&consumer_key='+ this.apiKey, apiUrl,
			debug_mode = this.debug;
			
		// force the secure url in unsecure environment
		url = url.replace(/^https?:/, protocol);
		
		// check if it's already a resolved api url
		if ((/api\.soundcloud\.com/).test(url)) {
			apiUrl = url + '?' + params;
		} else {
			apiUrl = resolve + url + '&' + params;
		}
		
		var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (this.readyState !== 4)
					return;
				if (this.status === 200) {
					try {
						var trackObj = JSON.parse(this.responseText);
					} catch(e) {
						if (debug_mode && window.console) {
							console.error(e)
						}
					} finally {
						callback(trackObj);
					}
				} else {
					if (debug_mode && window.console) {
						console.error('unable to GET '+ this.responseURL +' ('+ 
							this.status + (!this.statusText ? '' : ' '+ this.statusText) +')');
					}
					callback(null);
				}
			};
			xhr.open('GET', apiUrl, true);
			xhr.send(null);
	}
};

(function() {
	
	var SC = {
		'API': new SoundCloudAPI,
		'Global': true,
		'Volume': 0.8,
		'Store' : {},
		_listeners: {}
	}
	
	var _Current_ = {
		
		StoreItem  : null,
		TrackLoaded: null,
		SelectTrack: null,
		PlayerNode : null,
		AudioDevice: createAudioDevice(),
		/* Complex */
		set 'Player Volume'  (vol) {
			this.AudioDevice.volume = vol;
			this.PlayerNode['_volume_'].firstElementChild.style['width'] = (vol * 100) +'%';
		},
		get 'Player Volume'  () {
			return this.PlayerNode['_volume_'].firstElementChild.style['width'];
		},
		
		set 'Track Duration' (sec) {
			this.TrackLoaded.duration = sec;
			this.PlayerNode['_duration_'].textContent = (sec = timeCalc(sec));
			this.SelectTrack['_duration_'].textContent = sec;
		},
		get 'Track Duration' () {
			return this.SelectTrack['_duration_'].textContent;
		},
		
		set 'Track Progress' (sec) {
			this.PlayerNode['_position_'].textContent = timeCalc(sec);
			this.PlayerNode['_progress_'].style['width'] = (sec / this.AudioDevice.duration * 100) +'%';
		},
		get 'Track Progress' () {
			return this.PlayerNode['_progress_'].style['width'];
		},
		
		set 'Track Buffered' (buf) {
			this.PlayerNode['_buffer_'].style['width'] = buf +'%';
		},
		get 'Track Buffered' () {
			return this.PlayerNode['_buffer_'].style['width'];
		},
		
		connect: function(store_item, player_node) {
			if (!store_item) {
				return;
			}
			this.StoreItem = store_item;
			if (player_node && player_node !== this.PlayerNode) {
				if (this.PlayerNode) {
					this.PlayerNode[ '_volume_' ].onmousedown = null;
					this.PlayerNode['_waveform_'].onmousedown = null;
				}
				this.PlayerNode = ('_trackslist_' in player_node ? player_node : catchKeyElements('player', player_node));
				this.PlayerNode[ '_volume_' ].onmousedown = barChanger;
				this.PlayerNode['_waveform_'].onmousedown = barChanger;
				this['Player Volume'] = SC.Volume;
			}
			
			var idx = store_item.index,
				track = store_item.tracks[idx],
				track_node = this.PlayerNode['_trackslist_'].children[idx];
				
			if (track_node && track_node !== this.SelectTrack) {
				(this.PlayerNode.querySelector('.sc-track.active') || {}).className = 'sc-track';
				track_node.className = 'sc-track active';
				
				this.TrackLoaded = track;
				this['Track Progress'] = 0;
				this['Track Buffered'] = 0;
				
				updateTrackInfo(this.PlayerNode, track);
				this['AudioDevice'].loadTrack(track);
				this.SelectTrack = ('_duration_' in track_node ? track_node : catchKeyElements('track', track_node));
			}
		}
	}
	
	if (SC['Global']) {
		window.addEventListener('click', onClickHandler, false);
	}
	
	window.SCPurePlayer = {
		create: createSCElements,
		off: function(name, callback, idx) {
			if (SC._listeners[name] && (idx = SC._listeners[name].indexOf(callback)) !== -1) {
				delete SC._listeners[name][idx];
				       SC._listeners[name].splice(idx, 1);
			}
		},
		on : function(name, callback) {
			if (name in SC._listeners) {
				SC._listeners[name].push(callback);
			}
		}
	}
	
	document.addEventListener("DOMContentLoaded", onDOMReady);
	
	function onDOMReady(e) {
		Array.prototype.slice.call(this.getElementsByClassName('sc-player'), 0).forEach(createSCElements);
		if (_Current_['AudioDevice'].tagName === 'OBJECT') {
			var engineContainer = this.createElement('scont');
				engineContainer.className = 'sc-engine-container';
				engineContainer.setAttribute('style', 'position: absolute; left: -9000px');
				engineContainer.appendChild(_Current_['AudioDevice']);
			this.body.appendChild(engineContainer);
		}
	}
	function onEnd(e) {
		var next_player, next_item;
			_Current_.StoreItem.index++;
		if (_Current_.StoreItem.tracks[_Current_.StoreItem.index]) {
			_Current_.connect(_Current_.StoreItem);
		} else {
			_Current_.StoreItem.index = 0;
			_Current_.PlayerNode['_button_'].className = 'sc-play';
			_Current_.PlayerNode['_button_'].textContent = 'Play';
			_Current_.PlayerNode.className = 'sc-player';
			_Current_.SelectTrack.className = 'sc-track';
			_Current_.PlayerNode['_trackslist_'].children[0].className = 'sc-track active';
			if ((next_player = _Current_.PlayerNode.nextElementSibling) &&
				 next_player.className.substring(0, 9) === 'sc-player' && (
				 next_item = SC['Store'][next_player.id.slice(7)] )) {
					_Current_.connect(next_item, next_player);
			}
		}
	}
	function onTimeUpdate(e) {
		_Current_['Track Progress'] = e.target.currentTime;
	}
	function onBufferLoad(e) {
		if (_Current_['Track Buffered'] !== '100%') {
			_Current_['Track Buffered'] = this.bytesPercent;
		}
	}
	function onClickHandler(e) {
		if (e.button === 0 && e.target.className.slice(0, 3) === 'sc-') {
			var $target   = e.target,
				classList = $target.className.split(' '),
				$sc       = classList[0].split('-');
				fallback(e);
			switch ($sc[1]) {
				case 'info':
					if ($sc[2] === 'close') {
						$target.parentNode.className = 'sc-info';
					} else if ($sc[2] === 'toggle') {
						$target.parentNode.children[1].className = 'sc-info active';
					}
					break;
				case 'track':
					var $player = $target.parentNode.parentNode, $Id, $track;
					if ($sc[2]) {
						$player = $player.parentNode;
						$target = $target.parentNode;
					}
					
					$Id = $target.id.split('_');
					SC['Store'][$Id[2]].index = Number($Id[1]);
					_Current_.connect(SC['Store'][$Id[2]], $player);
					break;
				case 'play':
					var $player = !SC['Global'] ? this : $target.parentNode.parentNode,
						$Id = $player.id.split('_')[1];
					
					_Current_.connect(SC['Store'][$Id], $player);
				case 'pause':
					_Current_.AudioDevice[$sc[1]]();
			}
		}
	}
	function onPlayerAction(e) {
		for (var i = 0, el = document.querySelectorAll(
			'.sc-pause, .sc-player.played, .sc-player.paused'
		); i < el.length; i++) {
			if (el[i].className === 'sc-pause') {
				el[i].className   = 'sc-play';
				el[i].textContent = 'Play'   ;
			} else {
				el[i].className = 'sc-player';
			}
		}
		var ype = (e.type === 'play' ? 'ause' : 'lay')
		_Current_.PlayerNode['_button_'].className   = 'sc-p'+ ype;
		_Current_.PlayerNode['_button_'].textContent = 'P'   + ype;
		_Current_.PlayerNode.className = 'sc-player '+ e.type + (e.type === 'play' ? 'ed' : 'd');
	}
	function barChanger(e) {
		if (e.button !== 0) {
			return;
		}
		fallback(e);
		switch ( e.type ) {
			case 'mousedown':
				this.bound = barChanger.bind(this);
				window.addEventListener('mousemove', this.bound, false);
				window.addEventListener('mouseup', this.bound, false);
				this.rect = this.getBoundingClientRect();
				this.rect.width || (this.rect.width = this.rect.right - this.rect.left);
			case 'mousemove':
				var x = (e.clientX - this.rect.left) / this.rect.width * 100;
				if (this === _Current_.PlayerNode['_waveform_']) {
					var maxs = _Current_['AudioDevice'].duration,
						seek = x > 100 ? maxs : x < 0 ? 0 : Math.floor(maxs * x * 10000) / 1000000;
					_Current_['AudioDevice'].ontimeupdate = null;
					_Current_['Track Progress'] = (this.seek = seek);
				}
				if (this === _Current_.PlayerNode['_volume_']) {
					var vol = x > 100 ? 1 : x < 0 ? 0 : Math.round(x / 10) / 10;
					_Current_['Player Volume'] = (SC.Volume = vol);
				}
				break;
			case 'mouseup':
				if (this === _Current_.PlayerNode['_waveform_']) {
					_Current_['AudioDevice'].currentTime  = this.seek;
					_Current_['AudioDevice'].ontimeupdate = onTimeUpdate;
				}
				window.removeEventListener('mousemove', this.bound, false);
				window.removeEventListener('mouseup', this.bound, false);
		}
	}
	
	function createAudioDevice(url) {
		var audio, html5, flash;
		if (typeof HTMLAudioElement !== 'undefined') {
			audio = new Audio();
			html5 = audio.canPlayType && (/maybe|probably/).test(audio.canPlayType('audio/mpeg'));
		}
		if (!html5) {
			audio = document.createElement('object');
			audio.id     = 'scPlayerEngine';
			audio.height = '1';
			audio.width  = '1';
			audio.type   = "application/x-shockwave-flash"
			audio.data   = "/js/player_mp3_js.swf"
			audio.innerHTML = '<param name="movie" value="/js/player_mp3_js.swf" /><param name="AllowScriptAccess" value="always" /><param name="FlashVars" value="listener=flashBack2343191116fr_scEngine&interval=500" />';
			
			flash = (window['flashBack2343191116fr_scEngine'] = new Object());
			flash.onInit = function() {
				Object.defineProperties(audio, {
					loadTrack   : { value: function(trk) {
						this.SetVariable("method:setUrl",
							trk.stream_url + (isContain(trk.stream_url, '?') ? '&' : '?') +'consumer_key='+ SC['API'].apiKey);
						this.play(); }},
					play        : { value: function()    {
						flash.status = 'process';
						this.SetVariable("method:play", "");
						this.SetVariable("enabled", "true");
						onPlayerAction({type: 'play'}); }},
					pause       : { value: function()    {
						flash.status = 'waiting';
						this.SetVariable("method:pause", "");
						onPlayerAction({type: 'pause'}); }},
					stop        : { value: function()  { this.SetVariable("method:stop", "") }},
					ended       : { get: function()    { return flash.status === 'ended' }},
					playing     : { get: function()    { return JSON.parse(flash.isPlaying); }},
					duration    : { get: function()    { return Number(flash.duration) / 1000 || 0 }},
					currentTime : { get: function()    { return Number(flash.position) / 1000 || 0 },
								    set: function(rel) { this.SetVariable("method:setPosition", (rel * 1000)) }},
					volume      : { get: function()    { return Number(flash.volume) / 100 || _Current_.StoreItem.volume },
								    set: function(vol) { this.SetVariable("method:setVolume", (vol * 100)) }},
					ontimeupdate: { set: function(fn)  { flash.onTimeUpdate = fn || function(){} }}
				});
				audio['volume'] = SC.Volume;
				this.position = 0;
			};
			flash.onTimeUpdate = onTimeUpdate;
			flash.onBufferLoad = onBufferLoad;
			flash.onUpdate = function() {
				switch (this.status) {
					case 'process':
						this.onTimeUpdate({target: audio});
						if (this.position == '0' && this.isPlaying == 'false') {
							this.status = 'ended';
							onEnd();
						}
					case 'waiting':
						this.onBufferLoad();
				}
			};
		} else {
			Object.defineProperties(audio, {
				stop      : { value: function()    { this.pause(); this.currentTime = 0; }},
				bytesPercent: { get: function()    { return ((this.buffered.length && this.buffered.end(0)) / this.duration) * 100; }},
				loadTrack : { value: function(trk) {
					this.pause();
					this.src = trk.stream_url + (isContain(trk.stream_url, '?') ? '&' : '?') +'consumer_key='+ SC['API'].apiKey;
					this.play();
				}}
			});
			audio['volume'] = SC.Volume;
			audio['onplay'] = audio['onpause'] = onPlayerAction;
			audio['onended'] = onEnd;
			audio['ontimeupdate'] = onTimeUpdate;
			audio.addEventListener('timeupdate', onBufferLoad, false);
			audio['onprogress'] = onBufferLoad;
			audio['onloadedmetadata'] = function(e) {
				if (_Current_.TrackLoaded.duration !== this.duration) {
					_Current_['Track Duration'] = this.duration;
				}
			};
		}
		return audio;
	}
	function createTrackDOM(track, gid, i) {
		var li = document.createElement('li');
			li.id = 'sc-t_'+ i +'_'+ gid;
			li.className = 'sc-track' + (i === 0 ? ' active' : '');
			li.appendChild((
				li['_title_'] = document.createElement('a')));
				li['_title_'].href = track.permalink_url;
				li['_title_'].className = 'sc-track-title';
				li['_title_'].textContent = track.title;
			li.appendChild((
				li['_duration_'] = document.createElement('span')));
				li['_duration_'].className = 'sc-track-duration';
				li['_duration_'].textContent = timeCalc((track.duration /= 1000));
		return  li;
	}
	function createPlayerDOM(hash) {
		var div = document.createElement('div');
			div.className = 'sc-player loading';
			div.innerHTML = '<ol class="sc-artwork-list"></ol>\n'+
				'<div class="sc-info"><h3></h3><h4></h4><p></p>\n'+
				'	<a href="#x" class="sc-info-close">X</a>\n'+
				'</div>\n'+
				'<div class="sc-controls">\n'+
				'	<a href="#control" class="sc-play">Play</a>\n'+
				'</div>\n'+
				'<ol class="sc-trackslist"></ol>\n'+
				'<a href="#info" class="sc-info-toggle">Info</a>\n'+
				'<div class="sc-time-indicators">\n'+
				'	<span class="sc-position"></span>&nbsp;|&nbsp;<span class="sc-duration"></span>\n'+
				'</div>\n'+
				'<div class="sc-scrubber">\n'+
				'	<div class="sc-volume-slider">\n'+
				'		<span class="sc-volume-status" style="width: '+ (SC.Volume * 100) +'%;"></span>\n'+
				'	</div>\n'+
				'	<div class="sc-time-span">\n'+
				'		<div class="sc-buffer"></div>\n'+
				'		<div class="sc-played"></div>\n'+
				'		<div class="sc-waveform-container"></div>\n'+
				'	</div>\n'+
				'</div>';
		if (hash) {
			div.id = 'sc-obj_'+ hash;
			if (!SC['Global']) {
				div.addEventListener('click', onClickHandler, false);
			}
		}
		return catchKeyElements('player', div);
	}
	
	function catchKeyElements(name, _CN_) {
		switch(name) {
			case 'player':
				_CN_['_artwork_']    = _CN_.querySelector('.sc-artwork-list');
				_CN_['_info_']       = _CN_.querySelector('.sc-info');
				_CN_['_button_']     = _CN_.querySelector('.sc-controls').firstElementChild;
				_CN_['_trackslist_'] = _CN_.querySelector('.sc-trackslist');
				_CN_['_volume_']     = _CN_.querySelector('.sc-volume-slider');
				_CN_['_waveform_']   = _CN_.querySelector('.sc-waveform-container');
				_CN_['_buffer_']     = _CN_.querySelector('.sc-buffer');
				_CN_['_progress_']   = _CN_.querySelector('.sc-played');
				_CN_['_duration_']   = _CN_.querySelector('.sc-duration');
				_CN_['_position_']   = _CN_.querySelector('.sc-position');
				break;
			case 'track':
				_CN_['_duration_']   = _CN_.querySelector('.sc-track-duration');
				_CN_['_title_']      = _CN_.querySelector('.sc-track-title');
		}
		
		return _CN_;
	}
	
	function updateTrackInfo(node, track) {
		var artwork = track.artwork_url || track.user.avatar_url;
		if (artwork && !isContain(artwork, 'avatars-000044695144-c5ssgx-large.jpg')){
			var img = node['_artwork_'].firstElementChild || document.createElement('img');
			if (node['_artwork_'].clientWidth > 100) {
				var s = findBestMatch([200, 250, 300, 500], node['_artwork_'].clientWidth);
				artwork = artwork.replace('-large', '-t'+ s +'x'+ s +'')
			}
			img.src = artwork;
			node['_artwork_'].appendChild(img);
		}
		node['_info_'].children[0].innerHTML = '<a href="' + track.permalink_url +'">' + track.title + '</a>';
		node['_info_'].children[1].innerHTML = 'by <a href="' + track.user.permalink_url +'">' + track.user.username + '</a>';
		node['_info_'].children[2].innerHTML = (track.description || 'no Description');
		// update the track duration in the progress bar
		node['_duration_'].textContent = timeCalc(track.duration);
		node['_position_'].textContent = '0.00';
		// put the waveform into the progress bar
		var wave = node['_waveform_'].firstElementChild || document.createElement('img');
			wave.src = track.waveform_url;
		node['_waveform_'].appendChild(wave);
	}
	
	function createSCElements(scp) {
		var links, hash, node, info, length, index = 0;
	
		if (scp.href) {
			length = 1;
			links = [scp];
			hash = hashCodeURL(scp.href);
		} else if (
			scp.firstElementChild &&
			scp.firstElementChild.href
		) {
			length = scp.children.length;
			links = scp.children;
			hash = Math.round(Math.random() * 12345679);
		}
		
		if (hash in SC['Store']) {
			var p, n = 0;
			while ((p = hash +'-'+ n) in SC['Store']) {
				n++;
			}
			node = createPlayerDOM(p);
			SC['Store'][p] = {tracks: SC['Store'][hash].tracks, index: 0, volume: SC.Volume}
			SC['Store'][p].tracks.forEach(function(tr, j) {
				node['_trackslist_'].appendChild(createTrackDOM(tr, p, j));
			});
		} else if (links) {
			node = createPlayerDOM(hash);
			SC['Store'][hash] = {tracks: [], index: 0, volume: SC.Volume };
			SC['API'].getTrackInfo(links[0].href, funct);
		} else {
			node = createPlayerDOM(null);
		}
		
		scp.parentNode.replaceChild(node, scp);
		
		function funct(data) {
			var cUrl = links[index].href;
			if (data) {
				if (data.tracks || Array.isArray(data)) {
					// log('data.tracks', data.tracks);
					var tracks = (data.tracks || data);
						tracks.forEach(function(tr, j) {
							node['_trackslist_'].appendChild(createTrackDOM(tr, hash, j));
						});
					SC['Store'][hash].tracks = SC['Store'][hash].tracks.concat(tracks);
				} else if (data.duration){
					// a secret link fix, till the SC API returns permalink with secret on secret response
					data.permalink_url = cUrl;
					// if track, add to player
					SC['Store'][hash].tracks.push(data);
					node['_trackslist_'].appendChild(
						createTrackDOM(data, hash, (SC['Store'][hash].tracks.length - 1))
					);
				} else if (data.creator || data.username) {
					// get user or group tracks, or favorites
					links[index].href = data.uri + (data.username && isContain(cUrl, 'favorites') ? '/favorites' : '/tracks');
					index--;
				}
			}; index++;
			if (!info && SC['Store'][hash].tracks.length > 0) {
				info = SC['Store'][hash].tracks[0];
				updateTrackInfo(node, info);
			}
			if (length > index) {
				SC['API'].getTrackInfo(links[index].href, funct);
			} else if (!info) {
				delete SC['Store'][hash];
				node.removeAttribute('id');
			} else {
				node.className = 'sc-player';
			}
		}
	}
	
	function findBestMatch(list, toMatch) {
		for (var item, i = 0; i < list.length; i++) {
			if ((item = list[i]) >= toMatch) {
				return item;
			}
		}
		return item;
	}
	function timeCalc(secn) {
		var s, m, h;
			s = Math.floor(secn) % 60;
			m = Math.floor(secn / 60) % 60;
			h = Math.floor(secn / (60 * 60));
			
		return (h > 0 ? h +'.' : '') + (m > 9 || m == 0 ? m : '0'+ m) +'.'+ (s > 9 ? s : '0'+ s);
	}
	function hashCodeURL(uri) {
		var hash = 0, i = 0, chr, len,
			str = uri.replace(/^https?:\/\//, '');
		for(len   = str.length; i < len; i++) {
			chr   = str.charCodeAt(i);
			hash  = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}
	function isContain(str, word) {
		return str.indexOf(word) >= 0;
	}
	function fallback(e) {
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
	}
})();
