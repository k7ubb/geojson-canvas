window.MapCanvas = function(div){
	let wrapdiv = div;
	while(wrapdiv.firstChild){ wrapdiv.removeChild(wrapdiv.firstChild); }
	wrapdiv.style.position = "relative";
	
	let canvas = document.createElement("canvas");
	let context = canvas.getContext("2d");
	div.appendChild(canvas);
	
	Object.defineProperty(this, "canvas", { get: () => canvas });
	Object.defineProperty(this, "context", { get: () => context });
	
	let resizable = false;	// DOMのサイズ変更可能か
	let movable = false;	// スクロール、ズーム可能か
	let clickable = false;	// クリック位置のポリゴンの取得が可能か
	let hoverable = false;	// マウス位置のポリゴンの取得が可能か
	
	let width, height;
	
	let resizeCanvas = function(){
		width  = wrapdiv.clientWidth  * devicePixelRatio;
		height = wrapdiv.clientHeight * devicePixelRatio;
		canvas.width  = width;
		canvas.height = height;
		canvas.style.width  = wrapdiv.clientWidth  + "px";
		canvas.style.height = wrapdiv.clientHeight + "px";
	};
	resizeCanvas();
	addEventListener("resize", function(){
		resizeCanvas();
		this.update();
	}.bind(this));
	
	let scale, position_x, position_y;
	
	this.move = function(x, y, scl=scale){
		scale = scl;
		position_x = x;
		position_y = y;
	};
	
	this.moveCenter = function(x, y, scl=scale){
		scale = scl;
		this.move(x - width*scale/2, y + height*scale/2);
	};
	
	this.moveDiff = function(x, y){
		this.move(position_x - x*scale, position_y + y*scale);
	};
	
	this.changeScale = function(scl, x=width/2, y=height/2){
		this.move(
			position_x - x * (scl - scale),
			position_y + y * (scl - scale),
			scl
		);
		if(clickable){
			click_x = click_y = -1;
			onclickstatechange();
		}
		this.update();
	};
	
	this.moveCenter(138, 36, 0.02048);
	
	Object.defineProperty(this, "scale", {
		get: () => scale
	});
	
	let calc_x = x => (x - position_x) / scale;
	let calc_y = y => -(y - position_y) / scale;
	
	this.drawGeometry = function(geometry, lineWidth, lineColor, fillColor) {
		if (geometry?.type === "Polygon") {
			this.drawPolygon(geometry.coordinates, lineWidth, lineColor, fillColor);
		}
	};
	
	this.drawPolygon = function(polygons, lineWidth, lineColor, fillColor){
		context.lineWidth = lineWidth * devicePixelRatio;
		for(let polygon of polygons){
			context.beginPath();
			context.moveTo(
				calc_x(polygon[0][0]),
				calc_y(polygon[0][1])
			);
			for(let i=1; i<polygon.length; i++){
				context.lineTo(
					calc_x(polygon[i][0]),
					calc_y(polygon[i][1])
				);
			}
			context.closePath();
			if(fillColor){
				context.fillStyle = fillColor;
				context.fill();
			}
			if(lineWidth){
				context.strokeStyle = lineColor;
				context.stroke();
			}
		}
	};
	
	this.backgroundColor = "#fff";
	
		// マウス検知処理
	let mouseInPolygon = function(polygons, x, y){
		if(x == -1 && y == -1){ return false; }
		for(let polygon of polygons){
			context.beginPath();
			context.moveTo(
				calc_x(polygon[0][0]),
				calc_y(polygon[0][1])
			);
			for(let i=1; i<polygon.length; i++){
				context.lineTo(
					calc_x(polygon[i][0]),
					calc_y(polygon[i][1])
				);
			}
			context.closePath();
			if(context.isPointInPath(x, y)){ return true; }
		}
		return false;
	};
	
	
	/* -------- onupdateの登録および描画処理 -------- */
	
	let onupdate = function(){};
	Object.defineProperty(this, "onupdate", {
		set: function(f){
			if(typeof f == "function"){
				onupdate = f;
			}
			else{
				console.error("MapCanvas.onupdate must be function");
			}
		},
		get: () => onupdate
	});
	
	this.update = function(){
		context.fillStyle = this.backgroundColor;
		context.fillRect(0, 0, width, height);
		onupdate();
	};
	
	
	
	
	/* -------- movable関連の処理 -------- */
	
	// クリック開始時1、ドラッグ中2
	let movable_status = 0;
	
	let movable_mapimage = new Image();
	
	// ドラッグ開始時の座標
	let movable_start_x, movable_start_y;
	
	// 最新の指の位置
	let movable_x, movable_y;
	
	Object.defineProperty(this, "movable_start_x", {
		get: () => movable_x
	});
	
	let ondragstart = function(){};
	Object.defineProperty(this, "ondragstart", {
		set: function(f){
			if(typeof f == "function"){
				ondragstart = f;
			}
			else{
				console.error("MapCanvas.ondragstart must be function");
			}
		},
		get: () => ondragstart
	});
	
	let movable_eventStart = function(){
		movable_status = 1;
		movable_mapimage.src = canvas.toDataURL("png");
	};
	
	let movable_eventContinue = function(x, y, mapLib){
		if(movable_status == 1){
			movable_status = 2;
			movable_start_x = movable_x = x;
			movable_start_y = movable_y = y;
		}
		else if(movable_status == 2){
			movable_x = x;
			movable_y = y;
			context.fillStyle = mapLib.backgroundColor;
			context.fillRect(0, 0, width, height);
			context.drawImage(
				movable_mapimage,
				(movable_x - movable_start_x)*devicePixelRatio,
				(movable_y - movable_start_y)*devicePixelRatio
			);
			ondragstart();
		}
	};
	
	let movable_eventEnd = function(x, y, mapLib){
		if(movable_status == 2){
			mapLib.moveDiff((x - movable_start_x)*devicePixelRatio, (y - movable_start_y)*devicePixelRatio);
			mapLib.update();
		}
		movable_status = 0;
	};
	
	Object.defineProperty(this, "movable", {
		set: function(movable){
			if(movable){
				canvas.addEventListener("mousedown", movable_eventStart);
				canvas.addEventListener("touchstart", movable_eventStart);
				
				canvas.addEventListener("mousemove", function(){
					let offset = event.target.getBoundingClientRect();
					movable_eventContinue(event.clientX - offset.left, event.clientY - offset.top, this);
				}.bind(this));
				
				canvas.addEventListener("touchmove", function(){
					let offset = event.target.getBoundingClientRect();
					movable_eventContinue(event.touches[0].clientX - offset.left, event.touches[0].clientY - offset.top, this);
				}.bind(this));
				
				canvas.addEventListener("mouseup", function(){
					let offset = event.target.getBoundingClientRect();
					movable_eventEnd(event.clientX - offset.left, event.clientY - offset.top, this);
				}.bind(this));
				
				canvas.addEventListener("mouseleave", function(){
					let offset = event.target.getBoundingClientRect();
					movable_eventEnd(event.clientX - offset.left, event.clientY - offset.top, this);
				}.bind(this));
				
				canvas.addEventListener("touchend", function(){
					let offset = event.target.getBoundingClientRect();
					movable_eventEnd(event.changedTouches[0].clientX - offset.left, event.changedTouches[0].clientY - offset.top, this);
				}.bind(this));
				
				canvas.addEventListener("wheel", function(){
					if(movable_status == 0){
						let offset = event.target.getBoundingClientRect();
						if(event.deltaY > 0){
							this.changeScale(
								scale*2,
								(event.clientX - offset.left) * devicePixelRatio,
								(event.clientY - offset.top) * devicePixelRatio
							);
						}
						else{
							this.changeScale(
								scale/2,
								(event.clientX - offset.left) * devicePixelRatio,
								(event.clientY - offset.top) * devicePixelRatio
							);
						}
					}
				}.bind(this));
				
				for(let i=0; i<2; i++){
					let button = document.createElement("button");
					button.innerHTML = ["+", "−"][i];
					button.style.cssText = `
						position: absolute;
						top: ${i*50+16}px;
						left: 16px;
						appearance: none;
						width: 40px;
						height: 40px;
						font-size: 30px;
						line-height: 40px;
						vertical-align: middle;
						cursor: pointer;
						border: none;
						border-radius: 8px;
						background: #fff;
						color: #666;
						box-shadow: 0 1px 4px rgb(0 0 0 / 30%);
					`;
					button.addEventListener("click", [
						function(){ this.changeScale(scale/2); },
						function(){ this.changeScale(scale*2); }
					][i].bind(this));
					wrapdiv.appendChild(button);
				}
			}
		}
	});
	
	
	
	
	/* -------- clickableの登録処理 -------- */
	
	// クリック位置の座標 (クリック状態 → 解除の場合、-1)
	let click_x = -1, click_y = -1;
	
	let onclickstatechange = function(){};
	Object.defineProperty(this, "onclickstatechange", {
		set: function(f){
			if(typeof f == "function"){
				onclickstatechange = f;
			}
			else{
				console.error("MapCanvas.onclickstatechange must be function");
			}
		},
		get: () => onclickstatechange
	});
	
	let clickable_event = function(x, y, event){
		click_x = x*devicePixelRatio;
		click_y = y*devicePixelRatio;
		onclickstatechange(event);
	};
	
	this.polygonClick = function(polygon){
		return mouseInPolygon(polygon, click_x, click_y);
	};
	
	Object.defineProperty(this, "clickable", {
		set: function(clickable){
			if(clickable){
				canvas.addEventListener("mouseup", function(){
					let offset = event.target.getBoundingClientRect();
					clickable_event(event.clientX - offset.left, event.clientY - offset.top);
				}.bind(this));
				
				canvas.addEventListener("touchend", function(){
					let offset = event.target.getBoundingClientRect();
					clickable_event(event.changedTouches[0].clientX - offset.left, event.changedTouches[0].clientY - offset.top, event);
				}.bind(this));
				
			}
		}
	});
	
};
