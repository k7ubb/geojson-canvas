# geojson-canvas
geoJSON形式のジオメトリをcanvas APIで描画するjavascriptライブラリ

# 使用例
[経市区町村値マップ](https://map.bb.xrea.jp/): 訪問した市区町村を点数化・可視化するwebアプリです。

# 使用方法
geoJSON形式のデータを用意して、Canvasに描画する

```  
const feature = {
  type: "Feature",
  properties: { ... },
  geometry: {
    type: "Polygon",
    coordinates: [
      [ [135.00, 35.00], ... ]
    ]
  }
};

const geojson = new geojsonCanvas(document.getElementById("canvas"));

geojson.backgroundColor = "#EEF9F9";
geojson.scale = 0.00256;
geojson.moveCenter(138.3, 35);

geojson.drawGeometry(feature.geometry, 1, "#999", "#fff");
```


