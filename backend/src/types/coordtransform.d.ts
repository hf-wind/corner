declare module 'coordtransform' {
  type Coordinate = [number, number];

  const coordtransform: {
    wgs84togcj02(longitude: number, latitude: number): Coordinate;
    gcj02towgs84(longitude: number, latitude: number): Coordinate;
  };

  export default coordtransform;
}
