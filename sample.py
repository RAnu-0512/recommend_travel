from flask import Flask, render_template, jsonify, request, url_for,redirect
import webbrowser
import gensim
import csv
import math

# wor2vecモデル読み込み
model_path = "C:\\Users\\kobayashi\\Desktop\\word2vec\\cc.ja.300.vec.gz"
#model = gensim.models.KeyedVectors.load_word2vec_format(model_path, binary=False)

#県のスポットの緯度経度情報を読み込む
latlng_info_path = "C:\\Users\\kobayashi\\Desktop\\recommend_travel\\data\\latlng\\岡山.csv"
all_sn = []
all_lat = []
all_lng = []
with open(latlng_info_path, 'r', encoding='utf-8') as f_latlng:
    reader = csv.reader(f_latlng)
    for row in reader:
        if(len(row) >= 3):  # 最低3つの要素があることを確認
            all_sn.append(row[0])
            all_lat.append(float(row[1]))
            all_lng.append(float(row[2]))


app = Flask(__name__)


# 緯度と経度から距離を計算する(単位:km)
def haversine_distance(lat1, lng1, lat2, lng2):
    earth_radius = 6371
    # 緯度と経度をラジアンに変換
    lat1 = math.radians(lat1)
    lng1 = math.radians(lng1)
    lat2 = math.radians(lat2)
    lng2 = math.radians(lng2)
    # ハーバーサインの公式
    dlng = lng2 - lng1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return earth_radius * c

# 引数(緯度と経度)とn番目に近いスポットの情報を返却(sn,lat,lng,dist)(n>=1)
def calc_near_spot(lat,lng,n):
    if n <= 0 or n > len(all_sn):
        print("指定した順位のスポットは存在しません")
        return ["存在しません",0,0,0]
    calc_km = []
    for i in range(len(all_sn)):    
        calc_km.append(haversine_distance(lat,lng,all_lat[i],all_lng[i]))
    sorted_spot = sorted(zip(all_sn,all_lat,all_lng,calc_km), key=lambda x:x[-1])
    return sorted_spot[n-1]

@app.route("/", methods= ['GET'])
def return_html_test():
    print("test sucsess")
    return render_template("travel_recommend.html")

@app.route("/recommnd",methods=["GET"])
def recommend_spot():
    return "Hi"

@app.route("/send_latlng", methods=['POST'])
def send_latlng():
    print("send latlng")
    data = request.get_json()
    lat = float(data.get('cliked_lat'))
    lng = float(data.get('cliked_lng'))

    sp_info = calc_near_spot(lat,lng,1)

    #JavaScriptに返す  
    response_data = {'spot_name': sp_info[0] , 'lat': sp_info[1], 'lng': sp_info[2], "distance": sp_info[3] }
    return jsonify(response_data)

@app.route("/send_sentence", methods=["POST"])
def get_search_sentence():
    print("get search sentence")
    search_sentence = request.form["search"]
#    print(model.most_similar(search_sentence, topn=10))
    return redirect(url_for("recommend_spot"))

@app.route("/search", methods=["POST"])
def search():
    print("??")
    user_input=request.get_json()
    print(user_input)
    result = user_input.get("search")+"オッケーだぜ"
    return jsonify({"result": result})


if __name__ == "__main__":
    webbrowser.open('http://localhost:8000')
    app.run(debug=True,host='localhost', port=8000, threaded=True, use_reloader=False)

