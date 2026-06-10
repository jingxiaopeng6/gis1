export const REGIONS = [
  {
    id: 'china',
    label: '中国',
    center: [35, 105],
    zoomHint: '优先找 DEM / 影像 / 行政区数据',
  },
  {
    id: 'asia',
    label: '亚洲',
    center: [30, 95],
    zoomHint: '适合区域级地形与卫星影像',
  },
  {
    id: 'usa',
    label: '美国',
    center: [39, -98],
    zoomHint: 'USGS 数据检索最常用',
  },
  {
    id: 'global',
    label: '全球',
    center: [20, 0],
    zoomHint: '适合 Sentinel / Landsat / 全球 DEM',
  },
]

export const DATA_SOURCES = {
  china: [
    {
      name: '地理空间数据云',
      url: 'https://www.gscloud.cn/',
      description: '中国区域常用的 DEM、影像、专题数据入口。',
    },
    {
      name: '地理空间数据云检索',
      url: 'https://www.gscloud.cn/search',
      description: '按行政区、经纬度或地图选择进行检索。',
    },
  ],
  asia: [
    {
      name: '地理空间数据云',
      url: 'https://www.gscloud.cn/',
      description: '亚洲区域尤其是中国周边数据很常用。',
    },
    {
      name: 'Copernicus Browser',
      url: 'https://dataspace.copernicus.eu/browser/',
      description: '可检索 Sentinel、Copernicus DEM 等数据。',
    },
  ],
  usa: [
    {
      name: 'USGS EarthExplorer',
      url: 'https://earthexplorer.usgs.gov/',
      description: '美国区域常用 Landsat、SRTM 等数据入口。',
    },
    {
      name: 'NASA Earthdata Search',
      url: 'https://search.earthdata.nasa.gov/',
      description: 'NASA 官方地球观测数据检索入口。',
    },
  ],
  global: [
    {
      name: 'Copernicus Browser',
      url: 'https://dataspace.copernicus.eu/browser/',
      description: '全球 Sentinel、Copernicus DEM 数据检索。',
    },
    {
      name: 'NASA Earthdata Search',
      url: 'https://search.earthdata.nasa.gov/',
      description: '覆盖全球的 NASA Earth science 数据。',
    },
    {
      name: 'USGS EarthExplorer',
      url: 'https://earthexplorer.usgs.gov/',
      description: '全球 Landsat、USGS DEM 与影像资料。',
    },
  ],
}

