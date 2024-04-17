class geojsonCanvas {
	
	#div;
	#canvas;
	#context;
	
	constructor(div) {
		this.#div = div;
		while (this.#div.firstChild) {
			this.#div.removeChild(this.#div.firstChild);
		}
		this.#div.style.position = "relative";
		
		this.#canvas = document.createElement("canvas");
		this.#context = this.#canvas.getContext("2d");
		this.#div.appendChild(this.#canvas);
		this.#resizeCanvas();
		
		const resizeObserver = new ResizeObserver((entries) => {
			this.#resizeCanvas();
			this.update();
		});
		resizeObserver.observe(this.#div);
		
	};
	
	#clickable = false;	// クリック位置のポリゴンの取得が可能か
	#hoverable = false;	// マウス位置のポリゴンの取得が可能か
	
	
	
	
	/* -------- canvas領域の物理解像度 -------- */
	#width;
	#height;
	
	#resizeCanvas() {
		this.#width  = this.#div.clientWidth  * devicePixelRatio;
		this.#height = this.#div.clientHeight * devicePixelRatio;
		this.#canvas.width  = this.#width;
		this.#canvas.height = this.#height;
		this.#canvas.style.width  = this.#div.clientWidth  + "px";
		this.#canvas.style.height = this.#div.clientHeight + "px";
	};
	
	
	
	
	/* -------- onupdateの登録および描画処理 -------- */
	backgroundColor = "#fff";
	lineWidth = 1;
	
	#onupdate = function(){};
	set onupdate(f) {
		if(typeof f == "function"){
			this.#onupdate = f;
		}
		else{
			console.error("Uncaught TypeError: geoJson.onupdate is not a function");
		}
	};
	
	update() {
		const fillStyle_ = this.#context.fillStyle;
		this.#context.fillStyle = this.backgroundColor;
		this.#context.fillRect(0, 0, this.#width, this.#height);
		this.#onupdate();
		this.#context.fillStyle = fillStyle_;
	};
	
	
	
	
	/* -------- 地図上の座標計算処理 -------- */
	#position_x = 138;	// 経度
	#position_y = 36;		// 緯度
	scale = 0.02048;		// 縮尺 [°/px]
	
	move(x, y) {
		this.#position_x = x;
		this.#position_y = y;
	};
	
	moveCenter(x, y) {
		this.move(
			x - this.#width * this.scale / 2,
			y + this.#height * this.scale / 2
		);
	};
	
	moveDiff(x, y) {
		this.move(
			this.#position_x - x * this.scale,
			this.#position_y + y * this.scale
		);
	};
	
	changeScale(scale, x = this.width/2, y = this.height/2) {
		this.move(
			this.#position_x - x * (scale - this.scale),
			this.#position_y + y * (scale - this.scale)
		);
		this.scale = scale;
		if (this.clickable) {
			click_x = click_y = -1;
//			this.#onclickstatechange();
		}
		this.update();
	};
	
	
	
	
	/* -------- 地図描画処理 -------- */
	// 経度緯度 -> 座標に変換
	#deg2px(x, y) {
		return [ (x - this.#position_x) / this.scale, (this.#position_y - y) / this.scale ];
	};
	
	drawGeometry(geometry, lineWidth, lineColor, fillColor) {
		if (geometry?.type === "Polygon") {
			this.drawPolygon(geometry.coordinates, lineWidth, lineColor, fillColor);
		}
	};
	
	drawPolygon(polygons, lineWidth = 1, lineColor = "#000", fillColor = "#fff") {
		this.#context.lineWidth = lineWidth * devicePixelRatio;
		for (let polygon of polygons) {
			this.#context.beginPath();
			this.#context.moveTo(...this.#deg2px(...polygon[0]));
			for (let i=1; i<polygon.length; i++) {
				this.#context.lineTo(...this.#deg2px(...polygon[i]));
			}
			this.#context.closePath();
			if (fillColor) {
				this.#context.fillStyle = fillColor;
				this.#context.fill();
			}
			if (lineWidth) {
				this.#context.strokeStyle = lineColor;
				this.#context.stroke();
			}
		}
	};
	
	mouseInPolygon(polygons, x, y) {
		if(x == -1 && y == -1){ return false; }
		for(let polygon of polygons){
			context.beginPath();
			this.#context.moveTo(...this.#deg2px(...polygon[0]));
			for(let i=1; i<polygon.length; i++){
				this.#context.lineTo(...this.#deg2px(...polygon[i]));
			}
			context.closePath();
			if(context.isPointInPath(x, y)){ return true; }
		}
		return false;
	};
	
	
	
	
	/* -------- movable関連の処理 -------- */
	#draggable = false;
	
	set draggable(f) {
		if (f) { this.#dragInit(); }
	};
	
	// クリック開始時1、ドラッグ中2
	drag_status = 0;
	
	// ドラッグ中に保持しておく画像
	drag_mapimage = new Image();
	
	// ドラッグ開始時の座標
	#drag_start_x;
	#drag_start_y;
	
	// 最新の指の位置
	#drag_x;
	#drag_y;
	
	#ondragstart = function(){};
	set ondragstart(f){
		if (typeof f === "function") {
			this.#ondragstart = f;
		}
		else{
			console.error("Uncaught TypeError: geoJson.ondragstart is not a function");
		}
	};
	
	dragStart() {
		this.drag_status = 1;
		this.drag_mapimage.src = this.#canvas.toDataURL("png");
	};
	
	#dragContinue(x, y) {
		if (this.drag_status === 1) {
			this.drag_status = 2;
			this.#drag_start_x = this.#drag_x = x;
			this.#drag_start_y = this.#drag_y = y;
		}
		else if (this.drag_status === 2) {
			this.#drag_x = x;
			this.#drag_y = y;
			this.#context.fillStyle = this.backgroundColor;
			this.#context.fillRect(0, 0, this.#width, this.#height);
			this.#context.drawImage(
				this.drag_mapimage,
				(this.#drag_x - this.#drag_start_x) * devicePixelRatio,
				(this.#drag_y - this.#drag_start_y) * devicePixelRatio
			);
			this.#ondragstart();
		}
	};
	
	#dragEnd(x, y) {
		if (this.drag_status === 2){
			this.moveDiff(
				(x - this.#drag_start_x) * devicePixelRatio,
				(y - this.#drag_start_y) * devicePixelRatio
			);
			this.update();
		}
		this.drag_status = 0;
	};
	
	#dragInit() {
		this.#canvas.addEventListener("mousedown", this.dragStart);
		this.#canvas.addEventListener("touchstart", this.dragStart);
		
		this.#canvas.addEventListener("mousemove", function() {
			const offset = event.target.getBoundingClientRect();
			this.#dragContinue(event.clientX - offset.left, event.clientY - offset.top, this);
		}.bind(this));
		
		this.#canvas.addEventListener("touchmove", function() {
			const offset = event.target.getBoundingClientRect();
			this.#dragContinue(event.touches[0].clientX - offset.left, event.touches[0].clientY - offset.top, this);
		}.bind(this));
		
		this.#canvas.addEventListener("mouseup", function() {
			const offset = event.target.getBoundingClientRect();
			this.#dragEnd(event.clientX - offset.left, event.clientY - offset.top, this);
		}.bind(this));
		
		this.#canvas.addEventListener("mouseleave", function() {
			const offset = event.target.getBoundingClientRect();
			this.#dragEnd(event.clientX - offset.left, event.clientY - offset.top, this);
		}.bind(this));
		
		this.#canvas.addEventListener("touchend", function() {
			const offset = event.target.getBoundingClientRect();
			this.#dragEnd(event.changedTouches[0].clientX - offset.left, event.changedTouches[0].clientY - offset.top, this);
		}.bind(this));
		
		this.#canvas.addEventListener("wheel", function() {
			if (this.drag_status === 0) {
				const offset = event.target.getBoundingClientRect();
				if (event.deltaY > 0) {
					this.changeScale(
						this.scale * 2,
						(event.clientX - offset.left) * devicePixelRatio,
						(event.clientY - offset.top) * devicePixelRatio
					);
				}
				else {
					this.changeScale(
						scale / 2,
						(event.clientX - offset.left) * devicePixelRatio,
						(event.clientY - offset.top) * devicePixelRatio
					);
				}
			}
		}.bind(this));
		
		for (let i=0; i<2; i++) {
			const button = document.createElement("button");
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
				function(){ this.changeScale(this.scale / 2); },
				function(){ this.changeScale(this.scale * 2); }
			][i].bind(this));
			this.#div.appendChild(button);
		}
	};
		
	/* -------- clickableの登録処理 -------- */
	
	// クリック位置の座標 (クリック状態 → 解除の場合、-1)
	click_x = -1;
	click_y = -1;
	
	#onclickstatechange = function(){};
	set onclickstatechange(f) {
		if(typeof f == "function"){
			this.#onclickstatechange = f;
		}
		else{
			console.error("Uncaught TypeError: geoJson.onclickstatechange is not a function");
		}
	};
	
	clickable_event(x, y, event) {
		click_x = x*devicePixelRatio;
		click_y = y*devicePixelRatio;
		this.#onclickstatechange(event);
	};
	
	polygonClick(polygon) {
		return this.mouseInPolygon(polygon, click_x, click_y);
	};
	
	set clickable(f) {
		this.clickable = f;
		if(f){
			canvas.addEventListener("mouseup", function(){
				let offset = event.target.getBoundingClientRect();
				clickable_event(event.clientX - offset.left, event.clientY - offset.top);
			}.bind(this));
			
			canvas.addEventListener("touchend", function(){
				let offset = event.target.getBoundingClientRect();
				clickable_event(event.changedTouches[0].clientX - offset.left, event.changedTouches[0].clientY - offset.top, event);
			}.bind(this));
			
		}
	};
	
};
