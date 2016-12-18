# SoundCloud Pure Player
The project to rewrite [SoundCloud jQuery Player Plugin](https://github.com/soundcloud/soundcloud-custom-player) (© Matas Petrikas, MIT) on a pure js code.

Using example (add players automatically):
```html
<head>
   ...
   <link rel="stylesheet" href="/css/sc-player-standard/structure-horizontal.css" type="text/css">
   <link rel="stylesheet" href="/css/sc-player-standard/colors-orange.css" type="text/css">
   <script type="text/javascript" src="/js/sc-player.js"></script>
</head>
<body>
   ...
   <!-- for each single link -->
   <a class="sc-player" href="https://soundcloud.com/mau5trap/deadmau5-feat-chris-james-the">The Veldt</a>
   <!-- or creating a Group -->
   <div class="sc-player">
      <a href="https://soundcloud.com/kike-digital/lost-in-las-vegas-two-steps">Lost In Las Vegas</a>
      <a href="https://soundcloud.com/will_rp/revelation">Revelation</a>
      <a href="https://soundcloud.com/overwerk/daybreak">Daybreak</a>
   </div>
   ...
</body>
```

Manually adding:
```javascript
var links = document.querySelectorAll('a[href^="https://soundcloud.com/"]');

/* add players for each link */
for ( var i = 0; i < links.length; i++ ) {
    links[i].parentNode.replaceChild(
        SCPurePlayer.create(links[i]), links[i]
    );
}

/* or creating a Group */
links[0].parentNode.insertBefore(
    SCPurePlayer.createGroup(links), links[0]
);
links.forEach(function(lnk) {
    lnk.remove();
});
```

Adding custom listeners coming soon.

## Browser compatible
Should work on IE9+ / Opera 12.18+

For the browsers with no support audio/mpeg or html5 audio, player uses small and fast [Flash MP3 Player with JS API](http://flash-mp3-player.net/players/js/) (© Neolao Production, MIT)
