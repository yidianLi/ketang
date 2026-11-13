/* 细胞结构解剖 · 动物/植物细胞（SVG viewBox 0 0 640 420 坐标） */
(function (root) {
  'use strict';
  /* 每个细胞器：id, name, func, point(考点), cx, cy, rx, ry（椭圆热区；wall 为轮廓特例） */
  root.CELL_SETS = {
    animal: {
      name: '动物细胞',
      bg: '#f6e7e0',
      items: [
        { id: 'mem', name: '细胞膜', func: '保护细胞并控制物质进出，具有选择透过性', point: '“控制物质进出”是常考点', cx: 320, cy: 210, rx: 240, ry: 160, ring: true },
        { id: 'cyt', name: '细胞质', func: '细胞膜以内、细胞核以外的胶状物质，是代谢的主要场所', point: '各种生命活动在这里进行', cx: 320, cy: 250, rx: 200, ry: 110 },
        { id: 'nuc', name: '细胞核', func: '储存遗传信息，是细胞代谢和遗传的控制中心', point: 'DNA 主要分布在这里', cx: 320, cy: 170, rx: 66, ry: 58 },
        { id: 'mit', name: '线粒体', func: '呼吸作用的主要场所，为细胞生命活动提供能量', point: '细胞的“动力车间”', cx: 190, cy: 250, rx: 40, ry: 24 },
        { id: 'mit2', name: '线粒体', func: '呼吸作用的主要场所，为细胞生命活动提供能量', point: '动植物细胞都有线粒体', cx: 430, cy: 265, rx: 40, ry: 24 },
        { id: 'rib', name: '核糖体', func: '合成蛋白质的场所', point: '“生产蛋白质的机器”', cx: 250, cy: 205, rx: 18, ry: 13 },
        { id: 'ves', name: '小泡（囊泡）', func: '运输物质的小泡，可在细胞内搬运“货物”', point: '物质运输的“快递员”', cx: 395, cy: 300, rx: 24, ry: 16 },
        { id: 'lys', name: '溶酶体', func: '内含多种水解酶，能分解衰老的细胞器和入侵的病毒', point: '细胞的“消化车间”', cx: 452, cy: 180, rx: 26, ry: 18 },
        { id: 'gol', name: '高尔基体', func: '对蛋白质进行加工、分类和包装，再发送出去', point: '蛋白质的“加工厂”', cx: 225, cy: 300, rx: 34, ry: 18 },
        { id: 'er', name: '内质网', func: '与蛋白质、脂质的合成与运输有关', point: '细胞内的“物流网”', cx: 420, cy: 135, rx: 58, ry: 20 }
      ]
    },
    plant: {
      name: '植物细胞',
      bg: '#e7f0e2',
      items: [
        { id: 'wall', name: '细胞壁', func: '位于细胞最外层，起支持和保护作用', point: '植物细胞特有，全透性', cx: 320, cy: 210, rx: 250, ry: 168, ring: true },
        { id: 'pmem', name: '细胞膜', func: '紧贴细胞壁内侧，控制物质进出', point: '光学显微镜下不易看清', cx: 320, cy: 210, rx: 228, ry: 148, ring: true },
        { id: 'chl', name: '叶绿体', func: '光合作用的场所，把光能转变成化学能', point: '植物的“养料制造车间”和“能量转换站”', cx: 200, cy: 170, rx: 42, ry: 24 },
        { id: 'chl2', name: '叶绿体', func: '光合作用的场所，把光能转变成化学能', point: '叶肉细胞中数量最多', cx: 440, cy: 190, rx: 42, ry: 24 },
        { id: 'vac', name: '液泡', func: '内含细胞液，溶解着糖类、色素等多种物质', point: '成熟植物细胞的大液泡，调节渗透压', cx: 320, cy: 225, rx: 95, ry: 80 },
        { id: 'pnuc', name: '细胞核', func: '储存遗传信息，是细胞遗传与代谢的控制中心', point: '一般位于液泡与细胞壁之间', cx: 320, cy: 105, rx: 52, ry: 42 },
        { id: 'pcyt', name: '细胞质', func: '细胞膜以内、细胞核以外的胶状物质，生命活动的主要场所', point: '叶绿体悬浮在细胞质中', cx: 200, cy: 280, rx: 120, ry: 60 },
        { id: 'pmit', name: '线粒体', func: '呼吸作用的主要场所，为细胞提供能量', point: '动植物细胞都有', cx: 450, cy: 285, rx: 38, ry: 22 },
        { id: 'pgol', name: '高尔基体', func: '与植物细胞壁的形成有关', point: '植物细胞中参与建造细胞壁', cx: 250, cy: 320, rx: 34, ry: 16 },
        { id: 'per', name: '内质网', func: '与蛋白质、脂质的合成与运输有关', point: '与核膜相连', cx: 415, cy: 120, rx: 52, ry: 18 }
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
