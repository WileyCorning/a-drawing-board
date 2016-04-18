

// TODO cleanup

var canvas = document.getElementById("input-canvas");
var W=canvas.width;
var H=canvas.height;
var ctx = canvas.getContext('2d');
ctx.fillStyle="#fff";
ctx.fillRect(0,0,W,H);
var imdata = ctx.getImageData(0,0,W,H);
var selected_color = [0,0,0,255];

var set_pixel = function(image_data,x,y,rgba) {
  for(var i = 0; i < 4; i++) {image_data.data[4*x+4*y*imdata.width+i]=rgba[i]};
}
var render = function() {
  ctx.putImageData(imdata,0,0,0,0,canvas.width,canvas.height);
  window.requestAnimationFrame(render);
}
render();



var controller = (function(){
  this.mouse_down = false;
  this.prev_coord = [];
  this.curr_coord = [];
})();



ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.fillStyle="#FFFFFF";
ctx.fillRect(0,0,W,H);
ctx.fillStyle="#0000FF";

var scale = 1;

var discPattern = function(w) {
  var out = new Array(w*w);
  var c = ((w-1)/2);
  for(var i = 0; i < w; i++){
    for(var j = 0; j < w; j++){
      out[i+j*w] = Math.pow(i-c,2) + Math.pow(j-c,2) < Math.pow(w/2,2) ? 1 : 0;
    }
  }
  return out;
}



var Brush = function(width,data) {
  if(data.length%width !== 0){console.log('uh oh');}
  this.shape=[width,data.length/width];
  this.opacity=data;
  this.offset = [Math.floor(this.shape[0]/2),Math.floor(this.shape[1]/2)];
  this.draw = function(image_data,color,x,y){
    var left = x-this.offset[0];
    var top  = y-this.offset[1];

    for(var i = 0; i < this.shape[0]; i++) {
      for(var j = 0; j < this.shape[1]; j++) {
        var ii = left+i;
        var jj = top+j;
        if(0<=ii && ii<image_data.width && 0<=jj && jj < image_data.height){
          for(var k = 0; k < 4; k++) {
            image_data.data[(ii*4)+(jj*4)*image_data.width+k] = (1-this.opacity[i+j*this.shape[0]]) * image_data.data[(ii*4)+(jj*4)*image_data.width+k] + color[k]*this.opacity[i+this.shape[0]*j];
          }
        }
      }
    }
  }
}
brushes = {};
for(var i = 1; i < 26; i++){
  brushes[i]=new Brush(i,discPattern(i));
}

var interpolate = function(a,b) {
  var dx = b[0]-a[0];
  var dy = b[1]-a[1];
  var points = [];
  if(Math.abs(dx)>Math.abs(dy)) {
    var sl = dy/dx;
    var xinc = Math.sign(dx);
    var x = a[0];
    while(xinc*x < xinc*b[0]){
      x+=xinc;
      points.push([x,Math.floor(a[1]+sl*(x-a[0]))]);
    }
    return(points);
  }
  else {
    var sl = dx/dy;
    var yinc = Math.sign(dy);
    var y = a[1];
    while(yinc*y < yinc*b[1]){
      y+=yinc;
      points.push([Math.floor(a[0]+sl*(y-a[1])),y]);
    }
    return(points);
  }
}

console.log('aa')

selected_brush = brushes[3];
var refresh_selected_brush = function(){selected_brush = brushes[$('#controls-brush-slider').val()]}

$('#controls-brush input').on('input',refresh_selected_brush);
refresh_selected_brush();

var get_coords_of = function(event){
  var off = $(canvas).offset();
  var abs_coord = [event.pageX-off.left,event.pageY-off.top];
  var rel_coord = [Math.floor(abs_coord[0]/scale),
                   Math.floor(abs_coord[1]/scale)];
  return rel_coord;
}

// Drawing on the canvas alters an underlying ImageData object
// which is then rerendered to the canvas.
var control_state = {mouse:false};
var prev_coord;

var undoManager = new function() {
  this.stack=[];
  this.index = 0;
  this.max_len = 50;
  this.record=function(data) {
    if(this.index!==0){
      this.stack=this.stack.slice(this.index);
      this.index=0;
    }
    this.stack.unshift(data.slice(0));
    if(this.stack.length > this.max_len){
      this.stack.pop();
    }
  }
  this.undo = function() {
    if(this.index < this.stack.length-1) {
      this.index += 1;
    }
    return(this.stack[this.index]);
  }
  this.redo = function() {
    if(this.index > 0) {
      this.index -= 1;
    }
    return(this.stack[this.index]);
  }
}
undoManager.record(imdata.data);
var end_draw = function() {
  prev_coord = false;
  undoManager.record(imdata.data);
}
var draw_event = function(event){
  if(control_state.mouse) {
    var rel_coord = get_coords_of(event);
    selected_brush.draw(imdata,selected_color,rel_coord[0],rel_coord[1]);
    if(prev_coord){
      var between = interpolate(prev_coord,rel_coord);
      for(var i = 0; i < between.length; i++) {
        selected_brush.draw(imdata,selected_color,between[i][0],between[i][1]);
      }
    }
    prev_coord = rel_coord;
  }
}

var color_canvas = $('#controls-color-display')[0];
var color_ctx = color_canvas.getContext("2d");
var color_controls = $('#controls-color input');
var show_selected_color = function() {
  color_ctx.fillStyle='rgba('+selected_color+')';
  color_ctx.fillRect(0,0,color_canvas.width,color_canvas.height);
}
var refresh_selected_color = function() {
  for(var i = 0; i < 3; i++){selected_color[i]=color_controls[i].value;}
  show_selected_color();
}
color_controls.on('input',refresh_selected_color);
refresh_selected_color();


var pick_event = function(event){
  var rel_coord = get_coords_of(event);
  if(0<= rel_coord[0] && rel_coord[0]<imdata.width && 0 <= rel_coord[1] && rel_coord[1]<imdata.height) {
    console.log('ya');
    for(var k = 0; k < 3; k++) {
      console.log(k);
      selected_color[k] = imdata.data[4*rel_coord[0] + 4*rel_coord[1]*imdata.width + k];
    }
    console.log(selected_color);
    show_selected_color();
  }
}
$(canvas).contextmenu(function(event){event.preventDefault();});
$(document).mouseup(function(event){
  if(event.which===1){
    control_state.mouse=false;
    end_draw();
  }
});
$(document).keydown(function(e){
  if(e.ctrlKey){
    switch(e.which) {
      case 90: //z
        imdata.data.set(undoManager.undo());
        break;
      case 89: //y
        imdata.data.set(undoManager.redo());
        break;
    }
  }
});

$(canvas).mousedown(function(event){
  if(event.which===1){control_state.mouse=true;draw_event(event);}
});
$(canvas).mousedown(function(event){
  if(event.which===3){console.log('ba');pick_event(event);}
})
$(document).mousemove(draw_event);

var zoom_canvas = function(s) {
  scale = s;
  $(canvas).width(W*scale).height(H*scale);
}
