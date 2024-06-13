# geojson-canvas
geoJSON形式のジオメトリをcanvas APIで描画するjavascriptライブラリ

# 使用例
[市区町村ペイントマップ](https://map.bb.xrea.jp/): 市区町村を色分けした地図を作成するwebアプリです。

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


