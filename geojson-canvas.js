"use strict";

class geojsonCanvas {
	
	#div;
	#canvas;
	#context;
	
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

	get image() {
		return this.#canvas.toDataURL("png");
	};
	
	get context() {
		return this.#context;
	};
	
	constructor(div) {
		this.#div = div;
		while (this.#div.firstChild) {
			this.#div.removeChild(this.#div.firstChild);
		}
		if (getComputedStyle(this.#div).position === "static") {
			this.#div.style.position = "relative";
		}
		
		this.#canvas = document.createElement("canvas");
		this.#context = this.#canvas.getContext("2d");
		this.#div.appendChild(this.#canvas);
		this.#resizeCanvas();
		
		addEventListener("resize", function() {
			this.#resizeCanvas();
			this.update();
		}.bind(this));	
	};

	
	
	
	/* -------- 描画処理 -------- */
	backgroundColor = "#fff";
	
	#onupdate = function(){};
	set onupdate(f) {
		if (typeof f === "function") {
			this.#onupdate = f;
		}
		else {
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
	
	
	
	
	/* -------- 座標計算 -------- */
	#position_x = 138;	// 経度
	#position_y = 36;		// 緯度
	scale = 0.02048;		// 縮尺 [°/px]
	maxScale = 0.08192;
	minScale = 0.00016;
	
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
	
	changeScale(scale, x = this.#width/2, y = this.#height/2) {
		if (scale > this.maxScale || scale < this.minScale) { return; }
		this.move(
			this.#position_x - x * (scale - this.scale),
			this.#position_y + y * (scale - this.scale)
		);
		this.scale = scale;
		if (this.clickable) {
			click_x = click_y = -1;
			this.#onclickstatechange();
		}
		this.update();
	};
	
	
	
	
	/* -------- 描画 -------- */
	// 経度緯度 -> 座標に変換
	#deg2px(x, y) {
		return [ (x - this.#position_x) / this.scale, (this.#position_y - y) / this.scale ];
	};
	
	#createPath(polygon) {
		this.#context.beginPath();
		this.#context.moveTo(...this.#deg2px(...polygon[0]));
		for (let i = 1; i < polygon.length; i++) {
			this.#context.lineTo(...this.#deg2px(...polygon[i]));
		}
		this.#context.closePath();
	};

	#drawPolygon(polygons, lineWidth, lineColor, fillColor) {
		this.#createPath(polygons[0]);
		this.#context.lineWidth = lineWidth * devicePixelRatio;
		if (fillColor) {
			this.#context.fillStyle = fillColor;
			this.#context.fill();
		}
		if (lineWidth) {
			this.#context.strokeStyle = lineColor;
			this.#context.stroke();
		}
	};
	
	drawGeometry(geometry, lineWidth, lineColor, fillColor) {
		if (geometry?.type === "Polygon") {
			this.#drawPolygon(geometry.coordinates, lineWidth, lineColor, fillColor);
		}
		else if (geometry?.type === "MultiPolygon") {
			for (let coordinate of geometry.coordinates) {
				this.#drawPolygon(coordinate, lineWidth, lineColor, fillColor);
			}
		}
		else if (geometry?.type === "LineString") {
			const polygon = geometry.coordinates;
			this.#context.beginPath();
			this.#context.moveTo(...this.#deg2px(...polygon[0]));
			for (let i = 1; i < polygon.length; i++) {
				this.#context.lineTo(...this.#deg2px(...polygon[i]));
				this.#context.lineWidth = lineWidth * devicePixelRatio;
				this.#context.strokeStyle = lineColor;
				this.#context.stroke();
			}
		}
		else if (geometry?.type === "Point") {
			this.#context.beginPath();
			this.#context.arc(...this.#deg2px(...geometry.coordinates), lineWidth, 0, 2 * Math.PI);
			this.#context.closePath();
			this.#context.fillStyle = fillColor;
			this.#context.fill();
		}
	};
	
	
	
	
	/* -------- drag処理 -------- */
	set draggable(f) {
		if (f) { this.#dragInit(); }
	};
	
	// 拡大・縮小ボタン
	#buttons = [];

	set buttonOffset(x) {
		for (let button of this.#buttons) {
			button.style.left = `${x}px`;
		}
	};

	// クリック開始時1、ドラッグ中2
	#drag_status = 0;
	
	// ドラッグ中に保持しておく画像
	#drag_mapimage = new Image();
	
	// ドラッグ開始時の座標
	#drag_start_x;
	#drag_start_y;
	
	// 最新の指の位置
	#drag_x;
	#drag_y;
	
	#ondragstart = function(){};
	set ondragstart(f) {
		if (typeof f === "function") {
			this.#ondragstart = f;
		}
		else {
			console.error("Uncaught TypeError: geoJson.ondragstart is not a function");
		}
	};
	
	#dragStart() {
		this.#drag_status = 1;
		this.#drag_mapimage.src = this.#canvas.toDataURL("png");
	};
	
	#dragContinue(clientX, clientY, offset) {
		const x = clientX - offset.left;
		const y = clientY - offset.top
		if (this.#drag_status === 1) {
			this.#drag_status = 2;
			this.#drag_start_x = this.#drag_x = x;
			this.#drag_start_y = this.#drag_y = y;
		}
		else if (this.#drag_status === 2) {
			this.#drag_x = x;
			this.#drag_y = y;
			this.#context.fillStyle = this.backgroundColor;
			this.#context.fillRect(0, 0, this.#width, this.#height);
			this.#context.drawImage(
				this.#drag_mapimage,
				(this.#drag_x - this.#drag_start_x) * devicePixelRatio,
				(this.#drag_y - this.#drag_start_y) * devicePixelRatio
			);
			this.#ondragstart();
		}
	};
	
	#dragEnd(clientX, clientY, offset) {
		const x = clientX - offset.left;
		const y = clientY - offset.top;
		if (this.#drag_status === 2) {
			this.moveDiff(
				(x - this.#drag_start_x) * devicePixelRatio,
				(y - this.#drag_start_y) * devicePixelRatio
			);
			this.update();
		}
		this.#drag_status = 0;
	};
	
	#dragInit() {
		this.#canvas.addEventListener("mousedown", function() {
			this.#dragStart();
		}.bind(this));

		this.#canvas.addEventListener("touchstart", function() {
			this.#dragStart();
		}.bind(this));
		
		this.#canvas.addEventListener("mousemove", function(event) {
			this.#dragContinue(event.clientX, event.clientY, event.target.getBoundingClientRect())
		}.bind(this));
		
		this.#canvas.addEventListener("touchmove", function(event) {
			this.#dragContinue(event.touches[0].clientX, event.touches[0].clientY, event.target.getBoundingClientRect())
		}.bind(this));
		
		this.#canvas.addEventListener("mouseup", function(event) {
			this.#dragEnd(event.clientX, event.clientY, event.target.getBoundingClientRect());
		}.bind(this));
		
		this.#canvas.addEventListener("mouseleave", function(event) {
			this.#dragEnd(event.clientX, event.clientY, event.target.getBoundingClientRect());
		}.bind(this));
		
		this.#canvas.addEventListener("touchend", function(event) {
			this.#dragEnd(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.target.getBoundingClientRect());
		}.bind(this));
		
		this.#canvas.addEventListener("wheel", function(event) {
			if (this.#drag_status === 0) {
				const offset = event.target.getBoundingClientRect();
				this.changeScale(
					event.deltaY > 0 ? this.scale * 2 : this.scale / 2,
					(event.clientX - offset.left) * devicePixelRatio,
					(event.clientY - offset.top) * devicePixelRatio
				);
			}
			event.preventDefault();
		}.bind(this));
		
		for (let i = 0; i < 2; i++) {
			this.#buttons[i] = document.createElement("button");
			this.#buttons[i].innerHTML = ["＋", "－"][i];
			this.#buttons[i].style.cssText = `
				position: absolute;
				top: ${i*50+16}px;
				left: 16px;
				appearance: none;
				width: 40px;
				height: 40px;
				padding: 0;
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
			this.#buttons[i].addEventListener("click", [
				function(){ this.changeScale(this.scale / 2); },
				function(){ this.changeScale(this.scale * 2); }
			][i].bind(this));
			this.#div.appendChild(this.#buttons[i]);
		}
	};
		



	/* -------- click処理 -------- */
	#clickable = false;
	
	set clickable(f) {
		if (f) { this.#clickInit(); }
	};
	
	// クリック位置の座標 (クリック状態 → 解除の場合、-1)
	#click_x = -1;
	#click_y = -1;
	
	#mouseInPolygon(polygons, x, y) {
		this.#createPath(polygons[0]);
		if (this.#context.isPointInPath(x, y)) {
			return true;
		}
	};

	#mouseInGeometry(geometry, x, y) {
		if (x === -1 && y === -1){
			return false;
		}
		if (geometry?.type === "Polygon") {
			return this.#mouseInPolygon(geometry.coordinates, x, y);
		}
		else if (geometry.type === "MultiPolygon") {
			for (let coordinate of geometry.coordinates) {
				if (this.#mouseInPolygon(coordinate, x, y)) {
					return true;
				}
			}
		}
		return false;
	};
	
	#onclickstatechange = function(){};
	set onclickstatechange(f) {
		if (typeof f === "function") {
			this.#onclickstatechange = f;
		}
		else {
			console.error("Uncaught TypeError: geoJson.onclickstatechange is not a function");
		}
	};
	
	#click_event(clientX, clientY, offset) {
		this.#click_x = (clientX - offset.left) * devicePixelRatio;
		this.#click_y = (clientY - offset.top) * devicePixelRatio;
		this.#onclickstatechange();
	};
	
	isGeometryClicked(geometry) {
		return this.#mouseInGeometry(geometry, this.#click_x, this.#click_y);
	};
	
	#clickInit() {
		this.#canvas.addEventListener("mouseup", function (event) {
			this.#click_event(event.clientX, event.clientY, event.target.getBoundingClientRect());
		}.bind(this));

		this.#canvas.addEventListener("touchend", function (event) {
			this.#click_event(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.target.getBoundingClientRect());
		}.bind(this));
	};
	
};
