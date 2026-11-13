-- 12 关种子。页面运行时读这张表；src/mock/levels.ts 只留给冒烟测试。
insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L01$id$,
  1,
  $title$让电脑开口说话$title$,
  $goal$用 print 把一句话打印出来$goal$,
  $json${"level_id":"L01","order":1,"title":"让电脑开口说话","goal":"用 print 把一句话打印出来","grade_range":"2-5","demo_code":"print(\"  *  \")\nprint(\" *** \")\nprint(\"*****\")","expected_output":"一个用星号拼出来的三角形","preview_kind":"text","teach_code_lines":["print(\"  *  \")","print(\" *** \")","print(\"*****\")"],"keywords":["print","print()","print(\"\")"],"challenge_params":[{"name":"shape","label":"把星号换成别的符号","type":"select","default":"*","options":[{"value":"*","label":"* 星号"},{"value":"★","label":"★ 星星"},{"value":"#","label":"# 井号"},{"value":"O","label":"O 圆圈"}],"apply":{"kind":"replaceChar","char":"*"},"hint":"三行的星号一起换，图案会像换了一件新衣服。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"这三行 print 都跑完，屏幕上会出现什么？","options":["一个三角形","一个正方形","只有一行字"],"answerIndex":0,"explain":"三行星号一行比一行多，看起来就是一个小三角形。"},"estimated_minutes":20,"line_notes":["打印第一行：两个空格 + 一个星号","打印第二行：一个空格 + 三个星号 + 一个空格","打印第三行：五个星号连在一起，拼成三角形的底"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L02$id$,
  2,
  $title$海龟画第一条线$title$,
  $goal$让海龟往前走、再拐个弯$goal$,
  $json${"level_id":"L02","order":2,"title":"海龟画第一条线","goal":"让海龟往前走、再拐个弯","grade_range":"2-5","demo_code":"t.forward(200)\nt.right(90)\nt.forward(120)\nt.done()","expected_output":"一条横线加一条竖线，像一个小拐角","preview_kind":"turtle","teach_code_lines":["t.forward(200)","t.right(90)","t.forward(120)","t.done()"],"keywords":["t.forward","t.right","t.done"],"challenge_params":[{"name":"long","label":"把第一条线改长一点","type":"number","min":100,"max":260,"step":20,"default":200,"apply":{"kind":"arg","func":"forward","argIndex":0},"hint":"数字越大，线越长。"},{"name":"turn","label":"拐弯的角度也改一改","type":"select","default":"90","options":[{"value":"45","label":"45 度（拐个小弯）"},{"value":"90","label":"90 度（直角）"},{"value":"120","label":"120 度（拐得更大）"}],"apply":{"kind":"arg","func":"right","argIndex":0},"hint":"角度越大，第二条线拐得越开。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"t.right(90) 是让海龟做什么？","options":["往前走 90 步","向右转 90 度","把线变成 90 度那么长"],"answerIndex":1,"explain":"forward 才是往前走，right(90) 是原地向右转 90 度。"},"estimated_minutes":20,"line_notes":["让海龟往前直走 200 步，画出第一条线","原地向右转 90 度，给下一条线换个方向","再往前走 120 步，画出第二条线","画完了，收笔"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L03$id$,
  3,
  $title$画一个正方形$title$,
  $goal$重复「走一段、转个弯」把正方形画出来$goal$,
  $json${"level_id":"L03","order":3,"title":"画一个正方形","goal":"重复「走一段、转个弯」把正方形画出来","grade_range":"2-5","demo_code":"t.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)\nt.forward(120)\nt.right(90)","expected_output":"一个正方形","preview_kind":"turtle","teach_code_lines":["t.forward(120)","t.right(90)","t.forward(120)","t.right(90)","t.forward(120)","t.right(90)","t.forward(120)","t.right(90)"],"keywords":["t.forward","t.right","t.right(90)"],"challenge_params":[{"name":"edge","label":"把正方形的边长改一改","type":"number","min":60,"max":180,"step":20,"default":120,"apply":{"kind":"arg","func":"forward","argIndex":0,"occurrence":"all"},"hint":"四条边要一样长，正方形才正。"},{"name":"corner","label":"再试试把 90 度改掉","type":"select","default":"90","options":[{"value":"45","label":"45 度"},{"value":"90","label":"90 度（直角）"},{"value":"120","label":"120 度"}],"apply":{"kind":"arg","func":"right","argIndex":0,"occurrence":"all"},"hint":"只有 90 度才方方正正，改成别的角就歪了。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"要画正方形，海龟每次转多少度？","options":["45 度","90 度","180 度"],"answerIndex":1,"explain":"四个角加起来要转一整圈，每转 90 度，转四次正好回头。"},"estimated_minutes":20,"line_notes":["走第一条边，长 120","向右转 90 度，拐第一个角","走第二条边，长度一样","再转 90 度，拐第二个角","走第三条边","再转 90 度，拐第三个角","走第四条边","最后转 90 度，回到起点，正方形闭合"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L04$id$,
  4,
  $title$用一个变量控制边长$title$,
  $goal$把边长装进变量，改一处就全改$goal$,
  $json${"level_id":"L04","order":4,"title":"用一个变量控制边长","goal":"把边长装进变量，改一处就全改","grade_range":"3-5","demo_code":"size = 100\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)","expected_output":"一个边长可以调大调小的正方形","preview_kind":"turtle","teach_code_lines":["size = 100","t.forward(size)","t.right(90)","t.forward(size)","t.right(90)","t.forward(size)","t.right(90)","t.forward(size)","t.right(90)"],"keywords":["size","size = 100","t.forward(size)"],"challenge_params":[{"name":"size","label":"size 从 100 调到多少？","type":"number","min":50,"max":200,"step":10,"default":100,"apply":{"kind":"assign","variable":"size"},"hint":"变量就像一个小盒子，里面装着正方形现在的大小。"},{"name":"corner","label":"再改改拐弯的角度","type":"select","default":"90","options":[{"value":"45","label":"45 度"},{"value":"90","label":"90 度（直角）"},{"value":"120","label":"120 度"}],"apply":{"kind":"arg","func":"right","argIndex":0,"occurrence":"all"},"hint":"90 度才是正方形，改成别的角就不方了。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"把 size 改成 150，正方形会怎样？","options":["变大了","变小了","没有变化"],"answerIndex":0,"explain":"四个 forward 都用 size，改一处，四条边一起变长。"},"estimated_minutes":20,"line_notes":["把 100 装进变量 size，它就是正方形现在的边长","按 size 的长度走第一条边","转 90 度","走第二条边，还是用 size","转 90 度","走第三条边","转 90 度","走第四条边","再转 90 度，回到起点"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L05$id$,
  5,
  $title$综合：画一个可调三角形$title$,
  $goal$变量 + 转角，拼出一个能改大小的三角形$goal$,
  $json${"level_id":"L05","order":5,"title":"综合：画一个可调三角形","goal":"变量 + 转角，拼出一个能改大小的三角形","grade_range":"3-5","demo_code":"size = 120\nangle = 120\nt.forward(size)\nt.right(angle)\nt.forward(size)\nt.right(angle)\nt.forward(size)\nt.right(angle)","expected_output":"一个等边三角形","preview_kind":"turtle","teach_code_lines":["size = 120","angle = 120","t.forward(size)","t.right(angle)","t.forward(size)","t.right(angle)","t.forward(size)","t.right(angle)"],"keywords":["size","angle","t.right(angle)"],"challenge_params":[{"name":"size","label":"三角形边长","type":"number","min":60,"max":180,"step":20,"default":120,"apply":{"kind":"assign","variable":"size"}},{"name":"angle","label":"每次转多少度？","type":"select","default":"120","options":[{"value":"120","label":"120 度（三角形）"},{"value":"90","label":"90 度（拐个直角）"},{"value":"60","label":"60 度（试试看）"}],"apply":{"kind":"assign","variable":"angle"}}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"三角形三个角一样大，每次应该转多少度？","options":["60 度","90 度","120 度"],"answerIndex":2,"explain":"海龟转的是「外角」，三角形每个外角是 120 度。"},"estimated_minutes":20,"is_review":true,"line_notes":["三角形边长装进 size","每次转的角度装进 angle","走第一条边，长 size","转 angle 度，拐第一个角","走第二条边","再转 angle 度","走第三条边","最后转一次，三条边围成三角形"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L06$id$,
  6,
  $title$用 for 循环，8 行变 4 行$title$,
  $goal$把重复的动作交给 for 循环$goal$,
  $json${"level_id":"L06","order":6,"title":"用 for 循环，8 行变 4 行","goal":"把重复的动作交给 for 循环","grade_range":"3-5","demo_code":"size = 120\nfor i in range(4):\n    t.forward(size)\n    t.right(90)","expected_output":"和上一关一样的正方形，代码更短","preview_kind":"turtle","teach_code_lines":["size = 120","for i in range(4):","    t.forward(size)","    t.right(90)"],"keywords":["for","in range(4)","t.right(90)"],"challenge_params":[{"name":"repeat","label":"把 range(4) 改成几？","type":"select","default":"4","options":[{"value":"2","label":"2 次"},{"value":"4","label":"4 次"},{"value":"6","label":"6 次"}],"apply":{"kind":"arg","func":"range","argIndex":0},"hint":"转的次数变了，图形也会跟着变。"},{"name":"size","label":"边长也改一改","type":"number","min":60,"max":180,"step":20,"default":120,"apply":{"kind":"assign","variable":"size"},"hint":"边长和次数一起变，才能看出循环的本事。"},{"name":"corner","label":"每次转多少度？","type":"select","default":"90","options":[{"value":"60","label":"60 度"},{"value":"90","label":"90 度（直角）"},{"value":"120","label":"120 度"}],"apply":{"kind":"arg","func":"right","argIndex":0},"hint":"90 度画出来才是正方形。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"},{"pattern":"indent","friendlyMessage":"for 下面的两行要缩进 4 个空格，不然循环里什么都没有。"}],"quiz":{"question":"for i in range(4) 会把下面缩进的两行重复几次？","options":["1 次","4 次","无数次"],"answerIndex":1,"explain":"range(4) 数出来 0、1、2、3 四个数，所以重复 4 次。"},"estimated_minutes":20,"line_notes":["正方形边长 120","下面缩进的两行，重复 4 次","每次循环先往前走 size","再向右转 90 度"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L07$id$,
  7,
  $title$for + range 画多边形$title$,
  $goal$改一个数字就能画三角形、五边形、八边形$goal$,
  $json${"level_id":"L07","order":7,"title":"for + range 画多边形","goal":"改一个数字就能画三角形、五边形、八边形","grade_range":"3-5","demo_code":"sides = 5\nfor i in range(sides):\n    t.forward(80)\n    t.right(360 / sides)","expected_output":"一个正五边形","preview_kind":"turtle","teach_code_lines":["sides = 5","for i in range(sides):","    t.forward(80)","    t.right(360 / sides)"],"keywords":["sides","range(sides)","360 / sides"],"challenge_params":[{"name":"sides","label":"想画几边形？","type":"select","default":"5","options":[{"value":"3","label":"3 边形"},{"value":"4","label":"4 边形"},{"value":"5","label":"5 边形"},{"value":"8","label":"8 边形"}],"apply":{"kind":"assign","variable":"sides"},"hint":"360 除以边数，就是每次要转的角度。"},{"name":"edge","label":"每条边多长？","type":"number","min":60,"max":140,"step":20,"default":80,"apply":{"kind":"arg","func":"forward","argIndex":0},"hint":"边越长，多边形越大，形状不变。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"为什么转角是 360 / sides？","options":["转一整圈正好 360 度，要平均分给每条边","因为 360 是个吉利数字","海龟最多只能转 360 度"],"answerIndex":0,"explain":"走一圈要转满 360 度，几条边就平均分成几份。"},"estimated_minutes":20,"line_notes":["先定下要画 5 条边","重复 sides 次，也就是 5 次","每条边往前走 80","转 360/5=72 度，五条边才合得拢"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L08$id$,
  8,
  $title$if 判断，让海龟自己选颜色$title$,
  $goal$用 if / else 让电脑做一个选择$goal$,
  $json${"level_id":"L08","order":8,"title":"if 判断，让海龟自己选颜色","goal":"用 if / else 让电脑做一个选择","grade_range":"4-5","demo_code":"sides = 6\nif sides > 5:\n    t.color(\"teal\")\nelse:\n    t.color(\"orange\")\nfor i in range(sides):\n    t.forward(80)\n    t.right(360 / sides)","expected_output":"六边形，并且是青色的","preview_kind":"turtle","teach_code_lines":["sides = 6","if sides > 5:","    t.color(\"teal\")","else:","    t.color(\"orange\")","for i in range(sides):","    t.forward(80)","    t.right(360 / sides)"],"keywords":["if","else","t.color(\"teal\")"],"challenge_params":[{"name":"sides","label":"把 sides 改成几？","type":"select","default":"6","options":[{"value":"3","label":"3（走 else 分支）"},{"value":"6","label":"6（走 if 分支）"}],"apply":{"kind":"assign","variable":"sides"},"hint":"sides 变小时，颜色会换一种，说明 if 真的在判断。"},{"name":"edge","label":"每条边多长？","type":"number","min":60,"max":140,"step":20,"default":80,"apply":{"kind":"arg","func":"forward","argIndex":0},"hint":"边长只管大小，if 判断管的是颜色。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"},{"pattern":"indent","friendlyMessage":"if 和 else 下面的颜色那一行都要缩进 4 个空格。"}],"quiz":{"question":"sides 是 3 的时候，海龟会是什么颜色？","options":["青色","橙色","没有颜色"],"answerIndex":1,"explain":"3 不大于 5，if 不成立，就走 else 那一支，涂成橙色。"},"estimated_minutes":20,"line_notes":["边数 6，下面要做一个判断","如果边数大于 5（这次成立）","就用青色来画","否则（边数不大于 5 的时候）","换成橙色","重复 sides 次，把每条边都画出来","走一条边，长 80","转 360/sides 度，六边形每角 60 度"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L09$id$,
  9,
  $title$综合：循环里的 if，画双色多边形$title$,
  $goal$把循环和判断叠在一起，画出两种颜色$goal$,
  $json${"level_id":"L09","order":9,"title":"综合：循环里的 if，画双色多边形","goal":"把循环和判断叠在一起，画出两种颜色","grade_range":"4-5","demo_code":"sides = 5\nfor i in range(sides):\n    if i < 2:\n        t.color(\"teal\")\n    else:\n        t.color(\"orange\")\n    t.forward(90)\n    t.right(360 / sides)","expected_output":"前两条边青色、后面橙色的五边形","preview_kind":"turtle","teach_code_lines":["sides = 5","for i in range(sides):","    if i < 2:","        t.color(\"teal\")","    else:","        t.color(\"orange\")","    t.forward(90)","    t.right(360 / sides)"],"keywords":["for","if","360 / sides"],"challenge_params":[{"name":"sides","label":"把边数改成几？","type":"select","default":"5","options":[{"value":"3","label":"3 边"},{"value":"5","label":"5 边"},{"value":"6","label":"6 边"}],"apply":{"kind":"assign","variable":"sides"}},{"name":"edge","label":"每条边多长？","type":"number","min":60,"max":140,"step":10,"default":90,"apply":{"kind":"arg","func":"forward","argIndex":0},"hint":"边长变了，两个颜色照样一段一段排着。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"},{"pattern":"indent","friendlyMessage":"这里有两层缩进：if 在循环里要多缩一次，颜色那一行还要再缩一次。"}],"quiz":{"question":"i 是 0、1、2 的时候，分别是什么颜色？","options":["青、青、橙","橙、橙、青","全是青色"],"answerIndex":0,"explain":"i 小于 2 就是青色，从 i 等于 2 开始走 else，变成橙色。"},"estimated_minutes":20,"is_review":true,"line_notes":["五边形","每条边都走一遍","如果这是前两条边（i 是 0 或 1）","就用青色","否则，从第 3 条边开始","换成橙色","走一条边，长 90","转 360/5=72 度"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L10$id$,
  10,
  $title$变量加一加，越画越大$title$,
  $goal$每循环一次，把长度加上 20$goal$,
  $json${"level_id":"L10","order":10,"title":"变量加一加，越画越大","goal":"每循环一次，把长度加上 20","grade_range":"4-5","demo_code":"step = 40\nfor i in range(8):\n    t.forward(step)\n    step = step + 20\n    t.right(45)","expected_output":"一圈比一圈长的螺旋","preview_kind":"turtle","teach_code_lines":["step = 40","for i in range(8):","    t.forward(step)","    step = step + 20","    t.right(45)"],"keywords":["step","step = step + 20","t.right(45)"],"challenge_params":[{"name":"step","label":"第一步走多长？","type":"number","min":20,"max":80,"step":10,"default":40,"apply":{"kind":"assign","variable":"step"},"hint":"起点越长，整朵花越大。"},{"name":"angle","label":"每次转多少度？","type":"select","default":"45","options":[{"value":"30","label":"30 度（螺旋更紧）"},{"value":"45","label":"45 度"},{"value":"60","label":"60 度（螺旋更松）"}],"apply":{"kind":"arg","func":"right","argIndex":0},"hint":"角度越小，线条挤得越紧。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"这 8 条线会一样长吗？","options":["一样长","一条比一条长","一条比一条短"],"answerIndex":1,"explain":"每转一圈 step 就加 20，所以越走越长。"},"estimated_minutes":20,"line_notes":["第一步走 40","重复 8 次","按 step 的长度往前走","每走一次，step 加 20，所以越走越长","每次转 45 度，转出一圈螺旋"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L11$id$,
  11,
  $title$变量组合，画一片花边$title$,
  $goal$把长度和角度一起用起来$goal$,
  $json${"level_id":"L11","order":11,"title":"变量组合，画一片花边","goal":"把长度和角度一起用起来","grade_range":"4-5","demo_code":"length = 60\nfor i in range(6):\n    t.forward(length)\n    t.right(60)\n    length = length + 25","expected_output":"一片逐渐张开的花边","preview_kind":"turtle","teach_code_lines":["length = 60","for i in range(6):","    t.forward(length)","    t.right(60)","    length = length + 25"],"keywords":["length","length = length + 25","t.right(60)"],"challenge_params":[{"name":"length","label":"起始长度","type":"number","min":40,"max":90,"step":10,"default":60,"apply":{"kind":"assign","variable":"length"}},{"name":"angle","label":"每次转多少度？","type":"select","default":"60","options":[{"value":"45","label":"45 度"},{"value":"60","label":"60 度"},{"value":"90","label":"90 度"}],"apply":{"kind":"arg","func":"right","argIndex":0},"hint":"角度决定花边张开的样子。"}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"}],"quiz":{"question":"第一次循环结束时，length 变成多少？","options":["60","85","25"],"answerIndex":1,"explain":"60 加上 25，下一次循环就用 85 那么长。"},"estimated_minutes":20,"line_notes":["起始长度 60","重复 6 次","按 length 的长度走一条","转 60 度","每条再加长 25，花边越张越开"]}$json$::jsonb
);

insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  $id$L12$id$,
  12,
  $title$阶段收束：画一朵小星花$title$,
  $goal$把学过的循环、颜色、变量拼成一件作品$goal$,
  $json${"level_id":"L12","order":12,"title":"阶段收束：画一朵小星花","goal":"把学过的循环、颜色、变量拼成一件作品","grade_range":"4-5","demo_code":"petals = 6\nsize = 90\nfor i in range(petals):\n    t.color(\"teal\")\n    for j in range(4):\n        t.forward(size)\n        t.right(90)\n    t.right(360 / petals)","expected_output":"一朵六瓣的青色小花","preview_kind":"turtle","teach_code_lines":["petals = 6","size = 90","for i in range(petals):","    t.color(\"teal\")","    for j in range(4):","        t.forward(size)","        t.right(90)","    t.right(360 / petals)"],"keywords":["petals","range(petals)","360 / petals"],"challenge_params":[{"name":"petals","label":"花开几瓣？","type":"select","default":"6","options":[{"value":"4","label":"4 瓣"},{"value":"6","label":"6 瓣"},{"value":"8","label":"8 瓣"}],"apply":{"kind":"assign","variable":"petals"}},{"name":"size","label":"每片花瓣多大？","type":"number","min":60,"max":120,"step":10,"default":90,"apply":{"kind":"assign","variable":"size"}}],"error_mappings":[{"pattern":"cjk","friendlyMessage":"这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。"},{"pattern":"paren","friendlyMessage":"这一行的括号没有配对上，数一数左括号和右括号是不是一样多。"},{"pattern":"indent","friendlyMessage":"冒号后面要缩进 4 个空格，下一行要往右挪一点。"},{"pattern":"name","friendlyMessage":"有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。"},{"pattern":"indent","friendlyMessage":"外层循环缩进 4 格，里层循环里的两行还要再缩 4 格。"}],"quiz":{"question":"里层 for j in range(4) 负责画什么？","options":["一片花瓣（一个小正方形）","整朵花","只画一条线"],"answerIndex":0,"explain":"外层循环转一圈画一片花瓣，里层循环用 4 条边把花瓣画成正方形。"},"estimated_minutes":20,"line_notes":["六片花瓣","每片花瓣的边长 90","重复 6 次，一次画一片花瓣","花瓣用青色","每片花瓣是 4 条边的小正方形","走一条边","转 90 度","画完一片，转 360/6=60 度去画下一片"]}$json$::jsonb
);
