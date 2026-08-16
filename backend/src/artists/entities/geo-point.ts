// Formato GeoJSON mínimo que as colunas geography(Point,4326) do PostGIS usam. O
// TypeORM converte automático de/pra esse formato via ST_GeomFromGeoJSON/ST_AsGeoJSON
// quando a coluna está declarada com spatialFeatureType: Point.
export type GeoPoint = {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
};
