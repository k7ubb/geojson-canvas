# shpCanvas
地理情報をcanvas APIで描画するjavascriptライブラリ

# 使用例
[訪問市区町村マップ](https://map.bb.xrea.jp/)

# 使用方法
MultiPolygon形式のデータを用意して、Canvasに描画する

```
const polygon = [
  [[146.819,43.875], [146.821,43.874], ...],
  [[146.794,43.879], [146.787,43.877], ...],
  ...
];
const lineWidth = 1;
const lineColor = "#000000";
const fillColor = "#ff0000";
const shpCanvas = new MapCanvas(document.querySelector(".shpCanvas"));
shpCanvas.moveCenter(135, 35, 0.02048);
shpCanvas.drawPolygon(polygon, lineWidth, lineColor, fillColor);
```


