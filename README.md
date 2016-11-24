# SoundCloud Pure Player
The project to rewrite [SoundCloud jQuery Player Plugin](https://github.com/soundcloud/soundcloud-custom-player) (© Matas Petrikas, MIT) on a pure js code.

Using example:
```html
<head>
   ...
   <link rel="stylesheet" href="/css/sc-player-standard/structure-horizontal.css" type="text/css">
   <link rel="stylesheet" href="/css/sc-player-standard/colors-orange.css" type="text/css">
   <script type="text/javascript" src="/js/sc-player.js"></script>
</head>
<body>
   ...
   <a class="sc-player" href="https://soundcloud.com/mau5trap/deadmau5-feat-chris-james-the">The Veldt</a>
   <div class="sc-player">
      <a href="https://soundcloud.com/kike-digital/lost-in-las-vegas-two-steps">Lost In Las Vegas</a>
      <a href="https://soundcloud.com/will_rp/revelation">Revelation</a>
      <a href="https://soundcloud.com/overwerk/daybreak">Daybreak</a>
   </div>
   ...
</body>
```
And script add players automatically

Manually adding players example:
```javascript
var links = document.querySelectorAll('a[href^="https://soundcloud.com/"]');

for ( var i = 0; i < links.length; i++ ) {
    SCPurePlayer.create(links[i])
}
```

## Browser compatible
IE9+ / Opera 12.18+
