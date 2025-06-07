/**
* ***Stylized Common Player***
*
* Customizable HTML Audio Player with various forms and styles.
*
* - **Original source code** — https://github.com/OpenA/stylized-common-player
* - **License** — GNU GPLv3
* - **Author** — OpenA @ (2025)
*
*/

class SCPlayer extends HTMLElement {

	constructor({
		single_audio_instance = false,
		has_touch = ('ontouchstart' in window),
		theme = 'standart',
		variant = 'horizontal',
		colors = 'orange'
	}) {
		const sc_player = super();
		const sc_ui     = {};
		const sc_tracks = sc_ui.playlist = SCPlayer.cNode('sc-tracklist', 'sc-list');
		const sc_addinp = /* .......... */ SCPlayer.cNode('S-hidden', 'input');
		const sc_addbtn = /* .......... */ SCPlayer.cNode('sc-add-track', 'label');
		const sc_dropbx = sc_ui.dropBox  = SCPlayer.cNode('sc-box-drop');
		const sc_ctrlbx = sc_ui.ctrlBox  = SCPlayer.cNode('sc-box-controls');
		const sc_wavefm = sc_ui.waveform = SCPlayer.cNode('sc-waveform');
		const sc_artwrk = sc_ui.artwork  = SCPlayer.cNode('sc-artwork');
		const sc_volume = sc_ui.volume   = SCPlayer.cNode('sc-volume');
		const sc_tscale = sc_ui.timescal = SCPlayer.cNode('sc-time-scale');
		const sc_timein = sc_ui.timekind = SCPlayer.cNode('sc-time-indicators');
		const sc_inflay = sc_ui.infoLyer = SCPlayer.cNode('sc-info-overlay');
		const sc_info   = /* .......... */ SCPlayer.cNode('sc-info-toggle');
		const sc_play   = /* .......... */ SCPlayer.cNode('sc-play-toggle');
		const sc_volbar = sc_ui.volmBar  = SCPlayer.cNode('sc-bar-volume');
		const sc_bufbar = sc_ui.buffBar  = SCPlayer.cNode('sc-bar-buffer');
		const sc_plybar = sc_ui.playBar  = SCPlayer.cNode('sc-bar-plying');

		sc_addinp.type = 'file';
		sc_addinp.multiple = true;
		sc_volbar.style.width = '100%';
		sc_player.className = `sc-player-${theme} sc-P-${variant} sc-C-${colors}`;
		sc_player.append(sc_tracks, sc_dropbx, sc_ctrlbx);
		sc_ctrlbx.append(sc_artwrk, sc_volume, sc_tscale, sc_timein, sc_play, sc_inflay, sc_info);
		sc_dropbx.append(sc_addbtn);
		sc_volume.append(sc_volbar);
		sc_addbtn.append(sc_addinp);
		sc_tscale.appendChild(sc_wavefm).append(sc_bufbar, sc_plybar);

		sc_player.addEventListener('dragover' , e => this._onDragNDropHandler(e));
		sc_player.addEventListener('dragleave', e => this._onDragNDropHandler(e));
		sc_player.addEventListener('drop'     , e => this._onDragNDropHandler(e));
		sc_addinp.addEventListener('change'   , e => this.addTracksFromFiles(e.target.files));
		sc_player.addEventListener('click'    , e => this._onClickHandler(e));
		sc_volume.addEventListener('pointerdown', e => { if (!e.button) this._onBarChange(e, false) });
		sc_tscale.addEventListener('pointerdown', e => { if (!e.button) this._onBarChange(e, true) });
		sc_volume.addEventListener(has_touch ? 'touchstart' : 'mousedown', e => e.preventDefault());
		sc_tscale.addEventListener(has_touch ? 'touchstart' : 'mousedown', e => e.preventDefault());

		sc_ui.currTrack = null;
		sc_ui.audio = single_audio_instance ? SCPlayer.audio : new Audio;
		sc_ui.audio.autoplay = true;

		this._scui = sc_ui;

		Object.defineProperty(this, '_scui', {
			enumerable: false, writable: false
		});
	}

	static get audio() {
		const au = new Audio;
		Object.defineProperty(this, 'audio', { enumerable: true, value: au });
		return au;
	}

	static get metadata_db() {
		const db = new Map;
		Object.defineProperty(this, 'metadata_db', { enumerable: true, value: db });
		return db;
	}

/**
 * @param {[File]} files - if you use blob
 */
	addTracksFromFiles(files) {
		for(const file of files) {
			const key = `${file.type};${file.size}`;

			let ttl = file.name || '',
				  j = ttl.lastIndexOf('.'),
				ext = ttl.substring(j+1);

			if (SCPlayer.metadata_db.has(key) || !(/^(?:audio|video)\//.test(file.type) ||
				SCPlayer.SUPPORTED_FORMATS.includes(ext)
			)) continue;

			const trk = SCPlayer.cNode('sc-track', 'sc-item');
			const obj = { url: URL.createObjectURL(file) };
			trk.title = ttl;
			trk.dataset.duration = '--:--';
			trk.dataset.dbkey = key;
			trk.textContent = j === 0 ? '(empty name)' : ttl.substring(0,j).replace(/^\d\d\d?(?:\.|\:| \-)? /, '');
			SCPlayer.metadata_db.set(key, obj);
			this._scui.playlist.append( trk );
		}
	}

/**
 * @param {HTMLElement} track
 */
	selectTrack(track = this._scui.playlist.children[0]) {
		const au = this._scui.audio;
		const ui = this._scui;
		const {
			url, artist, title, album, cover
		} = SCPlayer.metadata_db.get(track.dataset.dbkey);

		track.classList.add('S-active');

		au.onpause = au.onloadedmetadata =
		au.onended = au.ontimeupdate =
		au.onplay = e => this._onMediaHandler(e);
		ui.currTrack = track;
		au.src = url;
	}

/**
 * @param {Event} e
 */
	_onMediaHandler({ type }) {
		const { currTrack, timekind, ctrlBox, audio, playBar } = this._scui;
		const { currentTime: ms, duration } = audio;

		switch (type) {
		case 'loadedmetadata':
			currTrack.dataset.duration = // vv v
			timekind.dataset.duration = SCPlayer.timeCalc(duration);
			break;
		case 'timeupdate':
			// no effeck
			if(!timekind.classList.contains('S-hook')) {
				timekind.dataset.pos = SCPlayer.timeCalc(ms);
				playBar.style.width = `${ms / duration * 100}%`;
			}
			break;
		case 'play' : ctrlBox.classList.remove('S-paused');
		case 'pause': ctrlBox.classList.add   (`S-${type.substring(0,4)}ed`); break;
		case 'ended': ctrlBox.classList.remove('S-paused', 'S-played');
			//
			/* ~~~ */ currTrack.classList.remove('S-active');
			let nxt = currTrack.nextElementSibling;
			if (nxt)
				this.selectTrack(nxt);
			break;
		}
	}
/**
 * @param {DragEvent} e
 */
	_onDragNDropHandler(e) {
		e.preventDefault();
		switch (e.type) {
		case 'drop':
			this.addTracksFromFiles(e.dataTransfer.files);
		case 'dragleave': this.classList.remove('S-ondrop'); break;
		case 'dragover' : this.classList.add   ('S-ondrop'); break;
		}
	}
/**
 * @param {MouseEvent} e
 */
	_onClickHandler(e) {
		const el = e.target,
			 ccl = el.classList,
			 pcl = el.parentNode.classList;

		switch (ccl[0]) {
		case 'sc-info-toggle':
			if (pcl.toggle('S-detail'))
				/**/;
			break;
		case 'sc-play-toggle':
			/**/ if (pcl.contains('S-paused')) this._scui.audio.play();
			else if (pcl.contains('S-played')) this._scui.audio.pause();
			else
				this.selectTrack();
			break;
		case 'sc-track':
			// select track
			if (!ccl.contains('S-active')) {
				if (this._scui.currTrack)
					this._scui.currTrack.classList.remove('S-active');
				this._scui.audio.pause();
				this.selectTrack(el);
			}
			break;
		case 'sc-download':
			SCPlayer.download(el.href);
			break;
		default:
			// ...
		}
	}
/**
 * @param {PointerEvent} e
 */
	_onBarChange(e, is_play_bar = false) {

		const bar    = is_play_bar ? this._scui.playBar  : this._scui.volmBar;
		const audio  = /* ------- */ this._scui.audio;
		const parent = is_play_bar ? this._scui.timekind : this._scui.volume;

		bar.style.width = bar.style.height = null; // reset bar to 100% w:h
		parent.classList.add('S-hook');

		const { left, width:maxw, // get bar coords and sizes 
				top, height:maxh } = bar.getBoundingClientRect();

		const is_vert = maxh > maxw;
		const hPos = x => {
			let v = (x -= left) / maxw;
			if (x < 0)
				x = v = 0;
			else if (x > maxw)
				x = maxw, v = 1.0;
			bar.style.width = `${x.toFixed()}px`;
			return v;
		}
		const vPos = y => {
			let v = (y = top + maxh - y) / maxh;
			if (y < 0)
				y = v = 0;
			else if (y > maxh)
				y = maxh, v = 1.0;
			bar.style.height = `${y.toFixed()}px`;
			return v;
		}
		const onMove = e => {
			const v = is_vert ? vPos(e.clientY) : hPos(e.clientX);
			if (is_play_bar) {
				parent.dataset.pos = SCPlayer.timeCalc(v * 100);
			} else {
				parent.dataset.percent = (v * 100).toFixed();
				audio.volume = v;
			}
		}
		const onEnd = e => {
			window.removeEventListener('pointercancel', onEnd);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onEnd);
			parent.classList.remove('S-hook');

			if (e.type.endsWith('up') && is_play_bar) {
				const v = is_vert ? vPos(e.clientY) : hPos(e.clientX);
				audio.currentTime = audio.duration * v;
			}
		}
		onMove(e);

		window.addEventListener('pointercancel', onEnd);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onEnd);
	}

	static cNode(cName = '', tag = 'div') {
		const el = document.createElement(tag);
		el.className = cName;
		return el;
	}
	static timeCalc(sec = 0) {
		let s = Math.floor(sec +  0) % 60, ds = (s > 9 ? '' : '0') + s;
		let m = Math.floor(sec / 60) % 60, dm = (m > 9 ? '' : '0') + m;
		let h = Math.floor(sec / (60 * 60));

		return `${h ? h +':' : ''}${dm}:${ds}`;
	}
}

Object.defineProperty(SCPlayer, 'SUPPORTED_FORMATS', {
	enumerable: true,
	writable: false,
	value: ['ogg','flac','opus','mp3','aac','m4a','m4r','m4v','mp4','webm','ogv']
});
customElements.define('sc-player', SCPlayer);
