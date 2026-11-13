/* ============================================================
   地理学科目录数据
   ------------------------------------------------------------
   路径相对于 ai-cases/geographylearn/index.html
   地形演示用 terrain.html 的查询参数定位不同题面：
     ?preset=ridge-valley|twin-peak|exam-composite
     &style=exam   试卷黑白图
     &view=3d      三维立体图
   fq : 考频（%），sc : 平均分值（分）——近五年考卷权重整理的近似参考值
   tag: key 重点学 / hot 高频 / gap 查漏补缺
   ============================================================ */

window.SUBJECT = {
  "key": "geography",
  "name": "地理",
  "title": "中学地理可视化互动学习",
  "subtitle": "先学会判图，再做对应的题——等高线判读之外，高一以上有 15 门 3D 课：水循环、三圈环流、洋流与厄尔尼诺、喀斯特地貌，把大气和水的运动放到三维沙盘上看。",
  "grades": [
    {
      "id": "g7",
      "label": "初一",
      "hint": "地图判读",
      "items": [
        {
          "k": "ridge",
          "group": "地图与地形",
          "t": "等高线：山脊与山谷",
          "f": "../../terrain.html?preset=ridge-valley",
          "src": "本站原创",
          "fq": 16,
          "sc": 6,
          "tag": "key",
          "d": "等高线向低处凸出的是山脊，向高处凸出的是山谷。同一条线上高度相同——这句话能推出河流该画在哪吗？"
        },
        {
          "k": "saddle",
          "t": "鞍部与两个山顶",
          "f": "../../terrain.html?preset=twin-peak",
          "src": "本站原创",
          "fq": 12,
          "sc": 5,
          "tag": "hot",
          "d": "两个山顶之间的低洼处叫鞍部，常是翻山的通道。图上怎么快速找到它，而不被密集的等高线绕晕？"
        },
        {
          "k": "exam",
          "t": "综合题图（试卷黑白图）",
          "f": "../../terrain.html?preset=exam-composite&style=exam",
          "src": "本站原创",
          "fq": 18,
          "sc": 8,
          "tag": "key",
          "d": "考试卷上的地形图只有黑线，没有颜色帮忙。判读顺序是：先看数值和等高距，再找山峰、鞍部、陡崖，最后才谈选址。"
        },
        {
          "k": "view3d",
          "t": "三维立体地形",
          "f": "../../terrain.html?preset=twin-peak&view=3d",
          "src": "本站原创",
          "fq": 8,
          "sc": 4,
          "tag": "gap",
          "d": "把平面等高线转成三维，山脊、山谷、鞍部立刻有了「立体感」。转一圈再回来看平面图，会好认很多。"
        },
        {
          "k": "ct-china-terrain",
          "kind": "lab",
          "group": "中国地形",
          "t": "中国三维地势图 · 三级阶梯",
          "f": "../china-terrain/index.html",
          "src": "china-terrain-3d（MIT）",
          "d": "基于真实高程数据的可交互中国地形：一、二、三级阶梯一眼看穿，等高线、分层设色、地形剖面、水位模拟都能动手调——「地势西高东低」不再是背下来的一句话。"
        },
        {
          "k": "climate",
          "group": "气候",
          "t": "气候类型判读",
          "f": "../../classroom.html#climate",
          "src": "本站原创",
          "fq": 20,
          "sc": 8,
          "tag": "key",
          "d": "看气温曲线和降水柱状图判断气候类型：先看最冷月气温定温度带，再看降水集中在哪个季节。"
        }
      ]
    },
    {
      "id": "g-tj-高一",
      "label": "高一",
      "hint": "必修一 · 自然地理基础",
      "items": [
        {
          "k": "tj-heating-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "大气受热过程",
          "f": "../tongjiang/courses/heating-step.html",
          "src": "铜匠实验室",
          "d": "太阳晒了一整天的地面，为什么白天先热起来，夜里又凉得那么快——大气到底替地面留住了多少热？（9 步：削弱→地面吸收→长波→…）"
        },
        {
          "k": "tj-karst-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "喀斯特地貌的形成与识别",
          "f": "../tongjiang/courses/karst-step.html",
          "src": "铜匠实验室",
          "d": "徐霞客写的「峭峰离立，分行竞颖」——这些像从地里长出来的尖峰，是怎么一块岩层变出来的？（7 步：溶→沟→洼→峰丛→峰林→…）"
        },
        {
          "k": "tj-soil-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "土壤的主要形成因素与土壤剖面观察",
          "f": "../tongjiang/courses/soil-step.html",
          "src": "铜匠实验室",
          "d": "东北的土又黑又肥，南方的土为什么相对贫瘠？（8 步：剖面→母质→生物→…）"
        },
        {
          "k": "tj-thermal-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "大气热力环流",
          "f": "../tongjiang/courses/thermal-step.html",
          "src": "铜匠实验室",
          "d": "台湾海峡两岸的风向，为什么一天里会反过来？（9 步：温差→高空→近地面→…）"
        },
        {
          "k": "tj-wind-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "大气的水平运动——风",
          "f": "../tongjiang/courses/wind-step.html",
          "src": "铜匠实验室",
          "d": "天气图上的风，为什么不是从高压直直吹向低压？（8 步：等压线→梯度力→地转偏向→…）"
        },
        {
          "k": "tj-water-cycle-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "水循环的过程与地理意义",
          "f": "../tongjiang/courses/water-cycle-step.html",
          "src": "铜匠实验室",
          "d": "江河不断注入大海，为什么大海的水没有增多？（9 步：全景→蒸发→蒸腾→…）"
        }
      ]
    },
    {
      "id": "g-tj-高二",
      "label": "高二",
      "hint": "选择性必修1 · 自然地理",
      "items": [
        {
          "k": "tj-river-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "河流地貌的发育",
          "f": "../tongjiang/courses/river-step.html",
          "src": "铜匠实验室",
          "d": "长江镇江段的岸线为什么持续向北推移？（8 步：认识沙盘→山区V形谷→河谷剖面→…）"
        },
        {
          "k": "tj-insolation-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "太阳直射点的回归运动与四季、五带",
          "f": "../tongjiang/courses/insolation-step.html",
          "src": "铜匠实验室",
          "d": "学校所在地的正午太阳高度和正午太阳方向，一年里为什么有规律地变化？（9 步：黄赤交角→回归运动→正午高度→…）"
        },
        {
          "k": "tj-currents-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "世界洋流的分布规律与影响",
          "f": "../tongjiang/courses/currents-step.html",
          "src": "铜匠实验室",
          "d": "数万只玩具鸭散落海面，为什么会漂到世界各地的海岸？（9 步：风推水走→中低纬成圈→中高纬反着转→…）"
        },
        {
          "k": "tj-enso-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "海—气相互作用与厄尔尼诺、拉尼娜",
          "f": "../tongjiang/courses/enso-step.html",
          "src": "铜匠实验室",
          "d": "秘鲁沿海常年干旱，为什么 2016 年底海水一暖，就下起了暴雨、还死了近百人？（7 步：交换→差→环流→…）"
        },
        {
          "k": "tj-tectonic-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "构造地貌的形成",
          "f": "../tongjiang/courses/tectonic-step.html",
          "src": "铜匠实验室",
          "d": "青藏高原上为什么会找到阔叶树的叶子化石 —— 什么力量把地表抬起来、又把它切开？（6 步：弯→分→倒置→…）"
        },
        {
          "k": "tj-earth-motion-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "地球运动的地理意义",
          "f": "../tongjiang/courses/earth-motion-step.html",
          "src": "铜匠实验室",
          "d": "同一时刻，为什么北京是中午、纽约是半夜，而夏天的白天又比冬天长？（9 步：自转→公转→昼夜半球→…）"
        },
        {
          "k": "tj-circulation-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "气压带、风带与三圈环流",
          "f": "../tongjiang/courses/circulation-step.html",
          "src": "铜匠实验室",
          "d": "麦哲伦船队为什么有的航段逆风、有的顺风，到了 30°S 附近却寸步难行？（7 步：赤道低压→30° 下沉→60° 爬升→…）"
        }
      ]
    },
    {
      "id": "g-tj-高三",
      "label": "高三",
      "hint": "选择性必修3 · 资源与国家安全",
      "items": [
        {
          "k": "tj-carbon-step",
          "kind": "lab",
          "group": "选择性必修3",
          "t": "全球气候变化与国家安全",
          "f": "../tongjiang/courses/carbon-step.html",
          "src": "铜匠实验室",
          "d": "马尔代夫为什么要把内阁会议开到 6 米深的海底去？（8 步：碳循环→两条输入→排放去向→…）"
        }
      ]
    }
  ]
};
