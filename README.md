# システム概要
ユーザはシステム上で「旅行の際着目するスポットの観点」を1つ以上自由に選択して、それに基づいた推薦が行われる
## システムの全体像
下図のパラメータ調整欄で観点と推薦距離を選択し、地図中で観光予定の中心地を選択することで、地図に推薦スポットとスポット情報が右に表示される
![K-002](https://github.com/RAnu-0512/recommend_travel/assets/131184347/9b04ac5b-7cae-46ae-a952-c1a773d846e1)


## 観点の選択欄
検索欄にクエリを入力すると、関連した観点が10個出力される

![K-001](https://github.com/RAnu-0512/recommend_travel/assets/131184347/f756e11f-8ef6-420b-853a-2a0deae8aabe)


「オススメの観点」を押すと進めの観点が10個表示される

![K-004](https://github.com/RAnu-0512/recommend_travel/assets/131184347/83367258-5178-4f02-85ff-8ef87c88fc07)

ユーザはチェックをし、「観点を追加」を押すと、選択した観点の欄に追加される
![図2](https://github.com/RAnu-0512/recommend_travel/assets/131184347/b8223406-9d1f-4fd8-98b3-9522e079c3aa)


「観点を決定」を押すと、「距離を決定」が押せるようになる

![K-007](https://github.com/RAnu-0512/recommend_travel/assets/131184347/8b52b83b-42a1-4be0-ad70-6feb6c701e34)

「距離を決定」を押すと「観点を修正」と「距離を修正」が押せるようになり、観点と距離が修正できるようになる。

![図1](https://github.com/RAnu-0512/recommend_travel/assets/131184347/c5d179b7-251f-4863-8d5a-23823ed65472)


## 推薦結果の表示欄
「距離を決定」を押すと地図上にピンを立てられるようになる

緑色のピン:選択した場所(観光予定の中心地)

を中心に、選択した距離内の観光スポットが推薦される

推薦されたスポットは青色のピンで表示される

右側にはスポットの情報が表示される

![K-016](https://github.com/RAnu-0512/recommend_travel/assets/131184347/668bad3c-28b6-4597-b86a-3e94f3951a08)


# プログラム実行方法
python server.pyでプログラムが実行される

python server.py --port ____　でポート番号を指定することができる

但し、"../wordvec/"のパスに事前に用意したword2vecのベクトルモデルが必要である

以下のURLで事前に学習済みの単語ベクトルを獲得できる

https://fasttext.cc/docs/en/crawl-vectors.html

フロントエンドはJavaScript、バックエンドはPythonで、Flaskを利用して構築している

