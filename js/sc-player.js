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
	
	var _$ = this;
	
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
		},
		getTracks : { value: $getTracks },
		fetch     : { value: $fetch }
	});
	
	function $fetch(url, callback, errorback) {
		
		if (!url) {
			return $panic('requested url is "'+ url +'"', errorback);
		}
		if (typeof callback !== 'function') {
			return (window.Promise ? new Promise(function(resolve, reject) {
				$fetch(url, resolve, reject)
			}) : null);
		}
		
		var protocol = (location.protocol === 'https:' ? 'https:' : 'http:'),
			resolve = protocol +'//api.soundcloud.com/resolve?url=',
			params = 'format=json&consumer_key='+ _$.apiKey, apiUrl;
			
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
						var data = JSON.parse(this.responseText);
					} catch(log) {
						if (_$.debug && window.console) {
							console.error(log)
						}
					} finally {
						callback(data);
					}
				} else {
					return $panic('unable to GET '+ url +' ('+ this.status +
						(!this.statusText ? '' : ' '+ this.statusText) +')', errorback);
				}
			};
			xhr.open('GET', apiUrl, true);
			xhr.send(null);
	}
	
	function $panic(msg, errorback) {
		if (_$.debug && window.console) {
			console.error('SoundCloudAPI: '+ msg);
		}
		if (typeof errorback !== 'function') {
			return (window.Promise ? new Promise(function(resolve, reject) {
				reject(new EvalError(msg));
			}) : null);
		} else
			errorback(new EvalError(msg));
	}
	
	function $getTracks(url, callback, errorback) {
		
		if (!url) {
			return $panic('requested url is "'+ url +'"', errorback);
		}
		if (typeof callback !== 'function') {
			return (window.Promise ? new Promise(function(resolve, reject) {
				$getTracks(url, resolve, reject)
			}) : null);
		}
		
		var $bound = function(data) {
			if (data) {
				if (data.tracks) {
					// log('data.tracks', data.tracks);
					callback(data.tracks);
				} else if (Array.isArray(data)) {
					callback(data);
				} else if (data.duration){
					// a secret link fix, till the SC API returns permalink with secret on secret response
					data.permalink_url = url;
					// if track, add to player
					callback([data]);
				} else if (data.creator || data.username) {
					// get user or group tracks, or favorites
					$fetch(data.uri + (data.username && url.indexOf('favorites') != -1 ? '/favorites' : '/tracks'), $bound, errorback);
				}
			}
		}
		$fetch(url, $bound, errorback);
	}
};

(function() {
	
	var SC = {
		'API': new SoundCloudAPI,
		'Global': false,
		'Volume': 0.8,
		'Tracks': {},
		'Object': {},
		get 'Progress'() {
			return 0;
		}
	}
	
	var _handler = 'ontouchstart' in window ? {
		start: 'touchstart',
		move: 'touchmove',
		end: 'touchend',
		getCoords: function(e) {
			return (e.touches.length === 1 ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : null);
		}
	} : {
		start: 'mousedown',
		move: 'mousemove',
		end: 'mouseup',
		getCoords: function(e) {
			return (e.button === 0 ? { x: e.clientX, y: e.clientY } : null);
		}
	};

	var _frameDownload = {
		iframe: null,
		open: function(uri) {
			if (!this.iframe) {
				this.iframe = document.createElement('iframe');
				this.iframe.width = this.iframe.height = 1;
				this.iframe.setAttribute('style', 'position: absolute; left: -9000px');
				this.iframe.frameBorder = 0;
			}
			document.body.appendChild(this.iframe).src = uri;
		}
	}	
	
	var _Current_ = {
		
		SavedState : null,
		TrackLoaded: null,
		SelectTrack: null,
		PlayerNode : null,
		AudioDevice: createAudioDevice(),
		/* Complex */
		set 'Player Volume' (vol) {
			this.AudioDevice.volume = this.SavedState.Volume = vol;
			this.PlayerNode['_volume_'].firstElementChild.style['width'] = (vol * 100) +'%';
		},
		get 'Player Volume' () {
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
			this.SavedState.Progress = sec;
			this.PlayerNode['_position_'].textContent = timeCalc(sec);
			this.PlayerNode['_progress_'].style['width'] = (sec / this.TrackLoaded.duration * 100) +'%';
		},
		get 'Track Progress' () {
			return this.PlayerNode['_progress_'].style['width'];
		},
		
		set 'Track Buffered' (buf) {
			this.PlayerNode['_buffer_'].style['width'] = buf +'%';
		},
		get 'Track Buffered' () {
			return this.PlayerNode['_buffer_'].style['width'] === '100%';
		},
		
		invokeEvent: function(name) {
			this.PlayerNode.dispatchEvent(
				new CustomEvent(name, {
					bubbles: true, cancelable: true,
					detail: {
						track: this.TrackLoaded, device: this.AudioDevice
					}
				}));
		},
		
		connect: function(player_node, track_node, saved_state) {
			
			if (saved_state) {
				this.SavedState = saved_state;
			}
			
			if (player_node && player_node !== this.PlayerNode) {
				if (this.PlayerNode) {
					this.PlayerNode[ '_volume_' ]['on'+ _handler.start] = null;
					this.PlayerNode['_waveform_']['on'+ _handler.start] = null;
				}
				this.PlayerNode = ('_trackslist_' in player_node ? player_node : catchKeyElements('player', player_node));
				this.PlayerNode[ '_volume_' ]['on'+ _handler.start] = barChanger;
				this.PlayerNode['_waveform_']['on'+ _handler.start] = barChanger;
				this['Player Volume'] = this.SavedState.Volume;
			}
			
			if (!track_node) {
				track_node = this.PlayerNode.querySelector('.sc-track.active') || this.PlayerNode['_trackslist_'].firstElementChild;
			}
				
			if (track_node && track_node !== this.SelectTrack) {
				(this.PlayerNode.querySelector('.sc-track.active') || {}).className = 'sc-track';
				track_node.className = 'sc-track active';
				
				this.SelectTrack = ('_duration_' in track_node ? track_node : catchKeyElements('track', track_node));
				this.TrackLoaded = SC['Tracks'][track_node.id.slice(track_node.id.lastIndexOf('_') + 1)];
				
				this['Track Buffered'] = 0;
				
				updateTrackInfo(this.PlayerNode, this.TrackLoaded);
				this['AudioDevice'].src = this.TrackLoaded.stream_url + (this.TrackLoaded.stream_url.indexOf('?') >= 0 ? '&' : '?') +'consumer_key='+ SC['API'].apiKey;
				this['AudioDevice'].currentTime = this.SavedState.Progress;
				this['AudioDevice'].play();
			}
		}
	}
	
	if (SC['Global']) {
		window.addEventListener('click', onClickHandler, false);
	}
	
	window.SCPurePlayer = {
		create: _scCreate,
		createGroup: _scCreateGroup
	}
	
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function(e) {
			this.removeEventListener(e.type, arguments.callee, false);
			onDOMReady();
		}, false);
	} else
		onDOMReady();
	
	function _scCreateGroup(links) {
		var $hash = genGroupId(),
			$node = createPlayerDOM($hash, links.length),
			ibx   = links.length;
		
		Array.prototype.slice.call(links, 0).forEach(function(link, it) {
			
			SC['API'].getTracks(link.href, function(tracks)
			{ ibx--;
				
				var tNode  = createTrackDOM(tracks[0], $hash),
					tChild = $node['_trackslist_'].children['ft_'+ $hash +'_'+ it];
				
				$node['_trackslist_'].replaceChild(tNode, tChild);
				
				if (it === 0 || ibx === 0 && !$node['_trackslist_'].querySelector('.active')) {
					updateTrackInfo($node, tracks[0]);
					tNode.className += ' active';
				}
				
				for (var j = 1; j < tracks.length; j++) {
					tChild = tNode.nextSibling;
					tNode  = createTrackDOM(tracks[j], $hash);
					$node['_trackslist_'].insertBefore(tNode, tChild);
				}
			}, function(error)
			{ ibx--;
				
				$node['_trackslist_'].children['ft_'+ $hash +'_'+ it].remove();
				if (ibx === 0) {
					if ($node['_trackslist_'].children.length == 0) {
						$node.removeAttribute('id');
					}
					else if (!$node['_trackslist_'].querySelector('.active')) {
						var tNode = $node['_trackslist_'].firstElementChild;
						updateTrackInfo($node, SC['Tracks'][tNode.id.split('_')[2]]);
						tNode.className += ' active';
					}
				}
			});
		});
		
		return $node;
	}
	
	function _scCreate(link) {
		var $hash = genGroupId(),
			$node = createPlayerDOM($hash);
			
		SC['API'].getTracks(link.href, function(tracks){
			for (var j = 0; j < tracks.length; j++) {
				var tNode = createTrackDOM(tracks[j], $hash);
				
				$node['_trackslist_'].insertBefore(
					tNode, $node['_trackslist_'].children[j]
				);
				if (j === 0) {
					updateTrackInfo($node, tracks[j]);
					tNode.className += ' active';
				}
			}
		}, function(error) {
			$node.removeAttribute('id');
		});
		
		return $node;
	}
	
	function onDOMReady(e) {
		Array.prototype.slice.call(document.getElementsByClassName('sc-player'), 0).forEach(function(scp) {
			var node, links;
			if (scp.href) {
				node = _scCreate(scp);
			} else if ((links = scp.querySelectorAll('a[href*="soundcloud.com/"]')).length > 0) {
				node = _scCreateGroup(links);
			} else
				node = createPlayerDOM(null);
			scp.parentNode.replaceChild(node, scp);
		});
		if (_Current_['AudioDevice'].tagName === 'OBJECT') {
			var engineContainer = document.createElement('scont');
				engineContainer.className = 'sc-engine-container';
				engineContainer.setAttribute('style', 'position: absolute; left: -9000px');
				engineContainer.appendChild(_Current_['AudioDevice']);
			document.body.appendChild(engineContainer);
		}
	}
	function onEnd(e) {
		var play_next;
			_Current_.SavedState.Progress = 0;
			_Current_.invokeEvent('ended');
		if ((play_next = _Current_.SelectTrack.nextElementSibling)) {
			_Current_.connect(null, play_next);
		} else {
			_Current_.PlayerNode['_button_'].className = 'sc-play';
			_Current_.PlayerNode['_button_'].textContent = 'Play';
			_Current_.PlayerNode.className = 'sc-player';
			_Current_.SelectTrack.className = 'sc-track';
			_Current_.PlayerNode['_trackslist_'].children[0].className = 'sc-track active';
			if ((play_next = _Current_.PlayerNode.nextElementSibling) && play_next.id &&
				 play_next.className.substring(0, 9) === 'sc-player') {
					_Current_.connect(play_next, null, SC['Object'][play_next.id.slice(play_next.id.indexOf('_') + 1)]);
			}
		}
	}
	function onTimeUpdate(e) {
		_Current_['Track Progress'] = e.target.currentTime;
		_Current_.invokeEvent('timeupdate');
	}
	function onBufferLoad(e) {
		if (!_Current_['Track Buffered']) {
			_Current_['Track Buffered'] = this.bytesPercent;
		}
	}
	function onClickHandler(e) {
		if (e.button != 0 || !e.target.className)
			return;
		if (e.target.className.slice(0, 3) === 'sc-') {
			var $target = e.target,
				$class  = $target.classList || $target.className.split(' '),
				$sc     = $class[0].split('-');
				e.preventDefault();
			switch ($sc[1]) {
				case 'download':
					_frameDownload.open($target.href);
					break;
				case 'info':
					if ($sc[2] === 'close') {
						$target.parentNode.className = 'sc-info';
					} else if ($sc[2] === 'toggle') {
						$target.parentNode.children[1].className = 'sc-info active';
					}
					break;
				case 'track':
					var $player = $target.parentNode.parentNode;
					if ($sc[2]) {
						$player = $player.parentNode;
						$target = $target.parentNode;
					}
					var $obj = SC['Object'][$player.id.slice($player.id.indexOf('_') + 1)];
						$obj.Progress = 0;
					_Current_.connect($player, $target, $obj);
					break;
				case 'play':
					var $player = $target.parentNode.parentNode;
					if (!$player.id)
						return;
					_Current_.connect($player, null, SC['Object'][$player.id.slice($player.id.indexOf('_') + 1)]);
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
		_Current_.invokeEvent(e.type);
	}
	function barChanger(e) {
		var coords = _handler.getCoords(e);
		if (!coords) {
			return;
		}
		e.preventDefault();
		
		var barMove, barEnd;
		var rect = this.getBoundingClientRect(),
			x = (coords.x - rect.left) / ('width' in rect ? rect.width : (rect.width = rect.right - rect.left));
			
		if (this === _Current_.PlayerNode['_waveform_']) {
			var maxs = _Current_.TrackLoaded.duration,
				curT = _Current_['AudioDevice'].currentTime,
				seek = x > 1 ? maxs : x < 0 ? 0 : Math.floor(maxs * x * 1000000) / 1000000;
			_Current_['AudioDevice'].ontimeupdate = null;
			_Current_['Track Progress'] = seek;
			if (seek > curT || curT < seek) {
				_Current_.invokeEvent('seeking');
			}
			barMove = function(eM) {
				maxs = _Current_.TrackLoaded.duration;
				x = (_handler.getCoords(eM).x - rect.left) / rect.width;
				seek = x > 1 ? maxs : x < 0 ? 0 : Math.floor(maxs * x * 1000000) / 1000000;
				_Current_['Track Progress'] = seek;
				_Current_.invokeEvent('seeking');
			}
			barEnd = function(eE) {
				_Current_['AudioDevice'].ontimeupdate = onTimeUpdate;
				_Current_['AudioDevice'].currentTime  = seek;
				_Current_.invokeEvent('seeked');
				window.removeEventListener(_handler.move, barMove, false);
				window.removeEventListener(eE.type, barEnd, false);
			}
		} else if (this === _Current_.PlayerNode['_volume_']) {
			var vol = x > 1 ? 1 : x < 0 ? 0 : Math.round(x * 1000) / 1000,
				sav = _Current_.SavedState.Volume;
			if (sav > vol || sav < vol) {
				_Current_.invokeEvent('volumechange');
			}
			_Current_['Player Volume'] = (sav = vol);
			barMove = function(eM) {
				x = (_handler.getCoords(eM).x - rect.left) / rect.width;
				vol = x > 1 ? 1 : x < 0 ? 0 : Math.round(x * 1000) / 1000;
				if (sav > vol || sav < vol) {
					_Current_.invokeEvent('volumechange');
				}
				_Current_['Player Volume'] = vol;
			}
			barEnd = function(eE) {
				window.removeEventListener(_handler.move, barMove, false);
				window.removeEventListener(eE.type, barEnd, false);
			}
		}
		window.addEventListener(_handler.move, barMove, false);
		window.addEventListener(_handler.end, barEnd, false);
	}
	
	function createAudioDevice(url) {
		var audio, html5, flash;
		if (typeof HTMLAudioElement !== 'undefined') {
			audio = new Audio;
			html5 = audio.canPlayType && (/maybe|probably/).test(audio.canPlayType('audio/mpeg'));
		}
		if (!html5) {
			audio = document.createElement('object');
			audio.id     = 'scPlayerEngine';
			audio.height = '1';
			audio.width  = '1';
			audio.type   = 'application/x-shockwave-flash';
			audio.data   = '/js/player_mp3_js.swf';
			audio.innerHTML = '<param name="movie" value="/js/player_mp3_js.swf" /><param name="AllowScriptAccess" value="always" /><param name="FlashVars" value="listener=flashBack2343191116fr_scEngine&interval=500" />';
			
			flash = (window['flashBack2343191116fr_scEngine'] = new Object());
			flash.onInit = function() {
				Object.defineProperties(audio, {
					play        : { value: function()    {
						flash.status = 'process';
						this.SetVariable('method:play', '');
						this.SetVariable('enabled', 'true');
						onPlayerAction({type: 'play'}); }},
					pause       : { value: function()    {
						flash.status = 'waiting';
						this.SetVariable('method:pause', '');
						onPlayerAction({type: 'pause'}); }},
					//stop        : { value: function()  { this.SetVariable('method:stop', '') }},
					src         : { get: function()    { return this.url },
								    set: function(url) { this.SetVariable('method:setUrl', url) }},
					ended       : { get: function()    { return flash.status === 'ended' }},
					playing     : { get: function()    { return JSON.parse(flash.isPlaying); }},
					duration    : { get: function()    { return Number(flash.duration) / 1000 || 0 }},
					currentTime : { get: function()    { return Number(flash.position) / 1000 || 0 },
								    set: function(rel) { this.SetVariable('method:setPosition', (rel * 1000)) }},
					volume      : { get: function()    { return Number(flash.volume) / 100 },
								    set: function(vol) { this.SetVariable('method:setVolume', (vol * 100)) }},
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
			var _BufferLoad = null;
			audio['volume'] = SC.Volume;
			audio['onplay'] = audio['onpause'] = onPlayerAction;
			audio['onended'] = onEnd;
			audio['ontimeupdate'] = onTimeUpdate;
			audio['onerror'] = function(e) {
				clearInterval(_BufferLoad);
				_Current_.invokeEvent('error');
			};
			audio['onloadedmetadata'] = function(e) {
				clearInterval(_BufferLoad);
				if (_Current_.TrackLoaded.duration !== this.duration) {
					_Current_['Track Duration'] = this.duration;
				}
				_BufferLoad = setInterval(function() {
					if (audio.buffered.length > 0) {
						var bytesPercent = audio.buffered.end(audio.buffered.length - 1) / audio.duration;
						if (bytesPercent === 1) {
							clearInterval(_BufferLoad);
						}
						_Current_['Track Buffered'] = bytesPercent * 100;
					}
				}, 100);
			};
		}
		return audio;
	}
	function createTrackDOM(track, hash) {
		SC['Tracks'][track.id] = track;
		var li = document.createElement('li');
			li.id = 'sc-t_'+ hash +'_'+ track.id;
			li.className = 'sc-track';
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
	function _li(h, l) {
		var li ='', i;
		for (i = 0; i < l; i++)
			li += '<span id="ft_'+h+'_'+i+'"></span>';
		return li;
	}
	function createPlayerDOM(hash, len) {
		var div = document.createElement('div');
			div.className = 'sc-player loading';
			div.innerHTML = '<ol class="sc-artwork-list"></ol>\n'+
				'<div class="sc-info"><h3></h3><h4></h4><p></p><a class="sc-download">&gt;&gt;Download&lt;&lt;</a>\n'+
				'	<div class="sc-info-close">X</div>\n'+
				'</div>\n'+
				'<div class="sc-controls">\n'+
				'	<div class="sc-play">Play</div>\n'+
				'</div>\n'+
				'<ol class="sc-trackslist">'+ _li(hash, len) +'</ol>\n'+
				'<div class="sc-info-toggle">Info</div>\n'+
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
				SC['Object'][hash] = { Volume: SC.Volume, Progress: 0 }
				div.addEventListener('click', onClickHandler, false);
			} else {
				SC['Object'][hash] = SC;
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
		if (artwork && artwork.indexOf('avatars-000044695144-c5ssgx-large.jpg') < 0){
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
		node['_info_'].children[3].href = track.download_url +'?consumer_key='+ SC['API'].apiKey;
		node['_info_'].children[3].hidden = !track.downloadable;
		// update the track duration in the progress bar
		node['_duration_'].textContent = timeCalc(track.duration);
		node['_position_'].textContent = '00.00';
		// put the waveform into the progress bar
		var wave = node['_waveform_'].firstElementChild || document.createElement('img');
			wave.src = track.waveform_url;
		node['_waveform_'].appendChild(wave);
	}
	
	function findBestMatch(list, toMatch) {
		var item, i = 0, len = list.length;
		while (i < len && (item = list[i]) < toMatch)
			i++;
		return item;
	}
	function timeCalc(secn) {
		var s, m, h;
			s = Math.floor(secn) % 60;
			m = Math.floor(secn / 60) % 60;
			h = Math.floor(secn / (60 * 60));
			
		return (h > 0 ? h +'.' : '') + (m < 10 && m > -1 ? '0'+ m : m) +'.'+ (s < 10 && s > -1 ? '0'+ s : s);
	}
	function genGroupId() {
		var n = Math.round(Math.random() * 12345679);
		while (n in SC['Object']) n++;
		return (SC['Object'][n] = n);
	}
	if (!('preventDefault' in Event.prototype)) {
		Event.prototype.preventDefault = function() {
			this.returnValue = false;
		};
	}
})();
