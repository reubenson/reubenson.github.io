<template>
  <div>
    <script type="text/javascript" src="http://code.jquery.com/jquery-latest.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js"></script>
    <script type="text/javascript" src="/private-chronology.js"></script>
    <script type="text/javascript" src="https://w.soundcloud.com/player/api.js"></script>
    <link rel="icon" href="https://s3.amazonaws.com/privatechronology/assets/icon.png" />
    <link href='http://fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800' rel='stylesheet' type='text/css'/>
    <nuxt />
  </div>
</template>

<style>
/*Modified from the MT default blog.css by Reuben Son*/

html,body,div,
ul,ol,li,dl,dt,dd,
form,input,textarea,
h1,h2,h3,h4,code,p,blockquote,hr,
th,td,a,.paypal {
font-family: 'Open Sans', "Helvetica Neue", sans-serif, Georgia;
    margin: 0;
    padding: 0;
}

h1,h2,h3,h4, .entry-title {
    font-size: 12pt;
    font-weight: normal;
}

p, .entry-body, .page-body { font-size: 85% }
h1, h4 { font-size: 10pt; }
#footer-content { font-size:80% }

p { font-weight: 400; font-size:10pt;text-align:justify;}

/*img { border:none }*/
/*form { display: relative }*/
:link, :visited {
    text-decoration: none;
    color:#000;
    /*font-weight: bold; */
    font-weight:600;
  }
a:hover { color:red }
a {font-size: 100%; font-weight:400;}

input, textarea {
  -webkit-appearance: none;
}

/* Utilities ----------------------------------------------------------------- */

.pkg:after, #content:after {
    content: " ";
    display: block;
    visibility: hidden;
    clear: both;
    height: 0.1px;
    font-size: 0.1em;
    line-height: 0;
}
.pkg, #content { display: block; }
/* no ie mac \*/

* html .pkg, * html #content { height: 1%; }
.pkg, #content { display: block; }
/* */

.inline { display: inline; }
.hidden { display: none; }

/* Layout ----------------------------------------------------------------- */

p {
  margin-bottom: 1em;
  /*display: inline;*/
  position:relative;
  font-size:100%;
}

#container {
    width: 88%;
    max-width: 1600px;
    min-width: 1000px;
    position:relative;
    margin: 60px auto 0px auto; }

#header, #content, #alpha, #beta, #footer {
    position: center; }

iframe {
  /*position:relative;*/
  margin: 8px 5px 1px auto;
  /*margin:2px 0px 0  0;*/
  /*padding: 0 20px;*/
  /*width: 95%;*/
  /*position:center;*/
}

#alpha {
  width: 68%;
  max-width: 1000px;
  bottom: 10px;
  display: inline;
  float: left;
  text-align:left;
  margin: 0px auto 0px auto;
  padding: 0 20px;
}

#stream {
  position:relative;
  width: 100%%;
  margin: 6px auto;
  display:inline;
}

#alpha_two {
  position:relative;
  font-size:10pt;
  margin: 0px auto 6px auto;
  /*top: -20px;*/
  text-align:center;
  width:100%;
  height: 30px;
  float:left;
  z-index: 4;
  display:inline;
}

#beta {
  top: 0px;
  right:0px;
  width: 33%;
  min-width: 300px;
  /*margin: 0px 20px;*/
  /*margin-right:20px;*/
  position:absolute;
  /*position:right;*/
  display:inline;
  /*left: 67%;*/
  /*float:right;*/
  text-align: left;
  padding:0 20px;
}

#header {
    position:fixed;
    top:0px;
    right:0px;
    width: 100%;
    background-color: #FFCC00;
    background: rgba(255, 204, 0, 0.6);
    background: rgba(1, 1, 1, 0.6);
    height: 32px;
    z-index: 6; }

#logo img {
  width: 150px;
  height: auto;
  float: right;
  padding: 4px;
  border:none;
}

#content, #footer {
    padding-top: 20px;
    padding-bottom: 20px;}

#bootstrap-carousel {
  /*margin-top: -10px;*/
  /*margin: -20px auto 0 auto;*/
  width:100%;
  float:left;
  position:relative;
}

#qcvg-carousel {
  margin: 0px 10px 0px auto;
  width: 50%;
  /*display:inline;*/
  position:relative;
  float:left;
}

p#qcvg-text {
  position:relative;
  /*margin-left:1%;*/
  display:inline;
  /*left:50%;*/
  text-align: left;
  /*float:left;*/
}

p#bio {
  font-size:10pt;
  position:relative;
  /*margin-top:10px;*/
}

.pbox{
  margin-top:20px;
}

.page-body, .entry-body {
  position:relative;
  width:100%;
  /*margin-top:-20px;*/
  /*margin-bottom: 10px; */
  margin-top: 7px;
  display:inline;
}

.entry-content, .asset-content {
  margin-top:7px;
}

.widget-about-this-page{
    font-weight: 400;
    font-size:11pt;
  }

.widget-bar, #footer-bar, #page-bar {
    margin-bottom: 4px;
    height: 2px;
    width: 100%;
    background-color: black;
    float: left;
  }

#footer-bar { clear: both; }

#page-bar { margin-bottom:6px; }

form {
  display:inline;
/*  position:center;
*/  margin:0 20px;
}

/* Content  */

.entry-meta { position:relative;  display:inline;}

.content-nav { text-align: center; }

#page-title, .widget-title, .entry-title {
  font-size: 11pt;
  letter-spacing: 3px;
  text-transform: uppercase; }

.widget-title {
  font-style: italic;
}

.widget-subtitle {
  font-size: 10pt;
  font-style: italic;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-top:10px;
}

.published {
  /*visibility: hidden;*/
  position:relative;
  font-size:9pt;
  letter-spacing: 2px;
  bottom:-4px;
  float: right;
}

/* Widgets */

.widget {
  margin-top: 10px;
  position: relative;
  overflow: hidden;
width: 100%;
}

.widget-content {}
  /*margin-top:10px;*/
  /*letter-spacing: 1.5px;*/
  /*font-weight: 800; */
  /*font-size: 12pt;*/
/* } */
/*.widget-content :link { font-weight:800italic; }*/

.widget { padding-bottom: 15px; }

.widget-items{
  position:relative;
  left:4px;
  margin-top:8px;
  /*letter-spacing: 1.5px;*/
  font-weight: 400;
  font-size: 10pt;
}

@media print {
    * {
        position: static ! important;
        overflow: visible ! important;
    }
}

/* Coloration */

body {
  background-image: -webkit-linear-gradient(left, #f3f3f3 15%, #fbfbfb 55%, #fbfbfb 65%, #f3f3f3 100%);
    /*background-color: #f3f3f3;*/
    /* background-image: -webkit-linear-gradient(left, #f3f3f3 15%, #fbfbfb 55%, #fbfbfb 65%, #f3f3f3 100%);
    background-image: -moz-linear-gradient(left, #f3f3f3 0%, #fbfbfb 15%, #fbfbfb 85%, #f3f3f3 100%);
    background-image: -o-linear-gradient(left, #f3f3f3 0%, #fbfbfb 15%, #fbfbfb 85%, #f3f3f3 100%);
    background-image: linear-gradient(left, #f3f3f3 0%, #fbfbfb 15%, #fbfbfb 85%, #f3f3f3 100%); */
    z-index: 2;
}

/*!
 * Bootstrap v3.3.2 (http://getbootstrap.com)
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

/*! normalize.css v3.0.2 | MIT License | git.io/normalize */

.modal-open {
  overflow: hidden;
}
.modal {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1040;
  display: none;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
  outline: 0;
}

.modal-open .modal {
  overflow-x: hidden;
  overflow-y: auto;
}
.modal-dialog {
  position: relative;
/*  margin-top: 40%;
*/  /*left:40%;*/
  padding-top:15%;
  width: auto;
  max-width:500px;
  margin: 10px;
  margin: auto;
  z-index:10;
}
.modal-content {
  position: relative;
  background-color: #fff;
  -webkit-background-clip: padding-box;
          background-clip: padding-box;
  border: 1px solid #999;
  border: 1px solid rgba(0, 0, 0, .2);
  border-radius: 6px;
  outline: 0;
  -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, .5);
          box-shadow: 0 3px 9px rgba(0, 0, 0, .5);
  z-index:15;
}
.modal-backdrop {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom:0;
  background-color: #000;
}
.modal-backdrop.fade {
  filter: alpha(opacity=0);
  opacity: 0;
}
.modal-backdrop.in {
  filter: alpha(opacity=50);
  opacity: .5;
}
.modal-header {
  min-height: 16.42857143px;
  padding: 15px;
  border-bottom: 1px solid #e5e5e5;
}
.modal-header .close {
  margin-top: -2px;
}
.modal-title {
  font-size:11pt;
  margin: 0;
  line-height: 1.42857143;
}
.modal-body {
  position: relative;
  padding: 15px;
  z-index:15;
}
.modal-footer {
  padding: 15px;
  text-align: center;
  border-top: 1px solid #e5e5e5;
}
.modal-footer .btn + .btn {
  margin-bottom: 0;
  margin-left: 5px;
}
.modal-footer .btn-group .btn + .btn {
  margin-left: -1px;
}
.modal-footer .btn-block + .btn-block {
  margin-left: 0;
}
.modal-scrollbar-measure {
  position: absolute;
  top: -9999px;
  width: 50px;
  height: 50px;
  overflow: scroll;
}
@media (min-width: 768px) {
  .modal-dialog {
    width: 600px;
    margin: 30px auto;
  }
  .modal-content {
    -webkit-box-shadow: 0 5px 15px rgba(0, 0, 0, .5);
            box-shadow: 0 5px 15px rgba(0, 0, 0, .5);
  }
  .modal-sm {
    width: 300px;
  }
}
.btn {
  display: inline-block;
  padding: 6px 12px;
  margin-bottom: 0;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.42857143;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  -ms-touch-action: manipulation;
      touch-action: manipulation;
  cursor: pointer;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
  background-image: none;
  border: 1px solid transparent;
  border-radius: 4px;
}

.btn:focus,
.btn:active:focus,
.btn.active:focus,
.btn.focus,
.btn:active.focus,
.btn.active.focus {
  outline:0;
  /*outline: thin dotted;*/
  /*outline: 5px auto -webkit-focus-ring-color;*/
  /*outline-offset: -2px;*/
}
.btn:hover,
.btn:focus,
.btn.focus {
  color: #333;
  text-decoration: none;
}
.btn:active,
.btn.active {
  background-image: none;
  outline: 0;
  -webkit-box-shadow: inset 0 3px 5px rgba(0, 0, 0, .125);
          box-shadow: inset 0 3px 5px rgba(0, 0, 0, .125);
}
.btn.disabled,
.btn[disabled],
fieldset[disabled] .btn {
  pointer-events: none;
  cursor: not-allowed;
  filter: alpha(opacity=65);
  -webkit-box-shadow: none;
          box-shadow: none;
  opacity: .65;
}
.btn-default {
  color: #333;
  background-color: rgba(0,0,0,0);
  border-color: #ccc;
}
.btn-default:hover,
.btn-default:focus,
.btn-default.focus,
.btn-default:active,
.btn-default.active,
.open > .dropdown-toggle.btn-default {
  color: #333;
  background-color: #e6e6e6;
  border-color: #adadad;
    border-color: #333;
  border-bottom-width:2px;
  border-right-width:2px;
}
.btn-default:active,
.btn-default.active,
.open > .dropdown-toggle.btn-default {
  background-image: none;

}
.btn-default.disabled,
.btn-default[disabled],
fieldset[disabled] .btn-default,
.btn-default.disabled:hover,
.btn-default[disabled]:hover,
fieldset[disabled] .btn-default:hover,
.btn-default.disabled:focus,
.btn-default[disabled]:focus,
fieldset[disabled] .btn-default:focus,
.btn-default.disabled.focus,
.btn-default[disabled].focus,
fieldset[disabled] .btn-default.focus,
.btn-default.disabled:active,
.btn-default[disabled]:active,
fieldset[disabled] .btn-default:active,
.btn-default.disabled.active,
.btn-default[disabled].active,
fieldset[disabled] .btn-default.active {
  background-color: #fff;
  border-color: #ccc;
}
.btn-default .badge {
  color: #fff;
  background-color: #333;
}

.btn-sm,
.btn-group-sm > .btn {
  padding: 3px 10px;
  font-size: 11.5px;
  line-height: 1.5;
  border-radius: 3px;
  margin:1px 3px;
}

/*rson overwrite*/
.btn-default{
  padding: 2px 7px;
  font-size: 10pt;
  border-radius:2px;
  border-width:1px;
  border-color: #333;
  /*line-height:1.25;*/
  /*border: none;*/
}

.btn-xs,
.btn-group-xs > .btn {
  padding: 1px 5px;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 3px;
}
.btn-block {
  display: block;
  width: 100%;
}
.btn-block + .btn-block {
  margin-top: 5px;
}
input[type="submit"].btn-block,
input[type="reset"].btn-block,
input[type="button"].btn-block {
  width: 100%;
}.close {
  float: right;
  font-size: 21px;
  font-weight: bold;
  line-height: 1;
  color: #000;
  text-shadow: 0 1px 0 #fff;
  filter: alpha(opacity=20);
  opacity: .2;
}
.close:hover,
.close:focus {
  color: #000;
  text-decoration: none;
  cursor: pointer;
  filter: alpha(opacity=50);
  opacity: .5;
}
button.close {
  -webkit-appearance: none;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
}.carousel {
  position: relative;
}
.carousel-inner {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.carousel-inner > .item {
  position: relative;
  display: none;
  -webkit-transition: .6s ease-in-out left;
       -o-transition: .6s ease-in-out left;
          transition: .6s ease-in-out left;
}
.carousel-inner > .item > img,
.carousel-inner > .item > a > img {
  line-height: 1;
}
@media all and (transform-3d), (-webkit-transform-3d) {
  .carousel-inner > .item {
    -webkit-transition: -webkit-transform .6s ease-in-out;
         -o-transition:      -o-transform .6s ease-in-out;
            transition:         transform .6s ease-in-out;

    -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
    -webkit-perspective: 1000;
            perspective: 1000;
  }
  .carousel-inner > .item.next,
  .carousel-inner > .item.active.right {
    left: 0;
    -webkit-transform: translate3d(100%, 0, 0);
            transform: translate3d(100%, 0, 0);
  }
  .carousel-inner > .item.prev,
  .carousel-inner > .item.active.left {
    left: 0;
    -webkit-transform: translate3d(-100%, 0, 0);
            transform: translate3d(-100%, 0, 0);
  }
  .carousel-inner > .item.next.left,
  .carousel-inner > .item.prev.right,
  .carousel-inner > .item.active {
    left: 0;
    -webkit-transform: translate3d(0, 0, 0);
            transform: translate3d(0, 0, 0);
  }
}
.carousel-inner > .active,
.carousel-inner > .next,
.carousel-inner > .prev {
  display: block;
}
.carousel-inner > .active {
  left: 0;
}
.carousel-inner > .next,
.carousel-inner > .prev {
  position: absolute;
  top: 0;
  width: 100%;
}
.carousel-inner > .next {
  left: 100%;
}
.carousel-inner > .prev {
  left: -100%;
}
.carousel-inner > .next.left,
.carousel-inner > .prev.right {
  left: 0;
}
.carousel-inner > .active.left {
  left: -100%;
}
.carousel-inner > .active.right {
  left: 100%;
}
.carousel-control {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 15%;
  font-size: 20px;
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .6);
  filter: alpha(opacity=50);
  opacity: .5;
}
.carousel-control.left {
  background-image: -webkit-linear-gradient(left, rgba(0, 0, 0, .25) 0%, rgba(0, 0, 0, .0001) 100%);
  background-image:      -o-linear-gradient(left, rgba(0, 0, 0, .25) 0%, rgba(0, 0, 0, .0001) 100%);
  background-image: -webkit-gradient(linear, left top, right top, from(rgba(0, 0, 0, .25)), to(rgba(0, 0, 0, .0001)));
  background-image:         linear-gradient(to right, rgba(0, 0, 0, .25) 0%, rgba(0, 0, 0, .0001) 100%);
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#80000000', endColorstr='#00000000', GradientType=1);
  background-repeat: repeat-x;
}
.carousel-control.right {
  right: 0;
  left: auto;
  background-image: -webkit-linear-gradient(left, rgba(0, 0, 0, .0001) 0%, rgba(0, 0, 0, .25) 100%);
  background-image:      -o-linear-gradient(left, rgba(0, 0, 0, .0001) 0%, rgba(0, 0, 0, .25) 100%);
  background-image: -webkit-gradient(linear, left top, right top, from(rgba(0, 0, 0, .0001)), to(rgba(0, 0, 0, .25)));
  background-image:         linear-gradient(to right, rgba(0, 0, 0, .0001) 0%, rgba(0, 0, 0, .25) 100%);
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00000000', endColorstr='#80000000', GradientType=1);
  background-repeat: repeat-x;
}
.carousel-control:hover,
.carousel-control:focus {
  color: #fff;
  text-decoration: none;
  filter: alpha(opacity=90);
  outline: 0;
  opacity: .75;
}
.carousel-control .icon-prev,
.carousel-control .icon-next,
.carousel-control .glyphicon-chevron-left,
.carousel-control .glyphicon-chevron-right {
  position: absolute;
  top: 50%;
  z-index: 5;
  display: inline-block;
}
.carousel-control .icon-prev,
.carousel-control .glyphicon-chevron-left {
  left: 50%;
  margin-left: -10px;
}
.carousel-control .icon-next,
.carousel-control .glyphicon-chevron-right {
  right: 50%;
  margin-right: -10px;
}
.carousel-control .icon-prev,
.carousel-control .icon-next {
  width: 20px;
  height: 20px;
  margin-top: -10px;
  font-family: serif;
  line-height: 1;
}
.carousel-control .icon-prev:before {
  content: '\2039';
}
.carousel-control .icon-next:before {
  content: '\203a';
}
.carousel-indicators {
  position: absolute;
  bottom:10px;
  /*margin-bottom: -3px;*/
  left: 50%;
  z-index: 15;
  width: 60%;
  padding-left: 0;
  margin-left: -30%;
  text-align: center;
  list-style: none;
}
.carousel-indicators li {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 1px;
  text-indent: -999px;
  cursor: pointer;
  background-color: #000 \9;
  background-color: rgba(255, 255, 255, 0.4);
  /*border: 1px solid #f3f3f3;*/
  border-radius: 10px;
}
.carousel-indicators .active {
  width: 12px;
  height: 12px;
  margin: 0;
  background-color: #f3f3f3;
  background-color: rgba(255, 255, 255, 0.4);
}
.carousel-caption {
  position: absolute;
  /*right: 15%;*/
  top: -15px;
  /*left: 15%;*/
  height: 10px;
  /*left:0;*/
  /*width:100%;*/
  z-index: 10;
  padding-top: 20px;
  padding-bottom: 20px;
  font-weight:400;
  color: #00;
  background-color:rgba(255, 255, 255, 0.8);
  /*background-image: -webkit-linear-gradient(top, rgba(0, 0, 0, 0.0) 0%, rgba(0, 0, 0, 0.3) 100%);*/
  /*background-image:      -o-linear-gradient(top, rgba(0, 0, 0, 0.0) 0%, rgba(0, 0, 0, 0.3) 100%);*/
  /*background-image: -webkit-gradient(linear, left top, right top, from(rgba(0, 0, 0, 0.0)), to(rgba(0, 0, 0, 0.3)));*/
  /*background-image:         linear-gradient(to top, rgba(0, 0, 0, 0.0) 0%, rgba(0, 0, 0, 0.3) 100%);  */
  /*color:black;*/
  text-align: center;
  /*text-shadow: 0 1px 2px rgba(0, 0, 0, 1);*/
}
.carousel-caption .btn {
  text-shadow: none;
}
@media screen and (min-width: 768px) {
  .carousel-control .glyphicon-chevron-left,
  .carousel-control .glyphicon-chevron-right,
  .carousel-control .icon-prev,
  .carousel-control .icon-next {
    width: 30px;
    height: 30px;
    margin-top: -15px;
    font-size: 30px;
  }
  .carousel-control .glyphicon-chevron-left,
  .carousel-control .icon-prev {
    margin-left: -15px;
  }
  .carousel-control .glyphicon-chevron-right,
  .carousel-control .icon-next {
    margin-right: -15px;
  }
  .carousel-caption {
    /*right: 20%;*/
    /*left: 20%;*/
    width:100%;
    padding-bottom: 15px;
  }
  .carousel-indicators {
    /*bottom: 20px;*/
  }
}.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.sr-only-focusable:active,
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
}

/*GLYPHICONS*/
/*@font-face {
  font-family: 'Glyphicons Halflings';

  src: url('/fonts/glyphicons-halflings-regular.eot');
  src: url('/fonts/glyphicons-halflings-regular.eot?#iefix') format('embedded-opentype'), url('/fonts/glyphicons-halflings-regular.woff2') format('woff2'), url('/fonts/glyphicons-halflings-regular.woff') format('woff'), url('/fonts/glyphicons-halflings-regular.ttf') format('truetype'), url('/fonts/glyphicons-halflings-regular.svg#glyphicons_halflingsregular') format('svg');
}*/
/*.glyphicon {
  position: relative;
  top: 1px;
  display: inline-block;
  font-family: 'Glyphicons Halflings';
  font-style: normal;
  font-weight: normal;
  line-height: 1;

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}*/

/*.glyphicon-chevron-left:before {
  content: "\e079";
}
.glyphicon-chevron-right:before {
  content: "\e080";
}*/

</style>
