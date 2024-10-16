from flask import Flask, render_template, jsonify, request, url_for,redirect
import webbrowser
import gensim
from read_sp_info import get_spotinfo
from return_aspect import return_aspect,popular_aspects
from calculate_distance import calc_near_spot
from return_spot import return_spot,get_other_pref_spot
from read_cluster_info import get_clusterinfo
from read_majorminer_info import get_majorminer_info
import argparse
import csv
import random
top_n = 20 #推薦スポット数
aspect_top_n = 10 #ヒットする観点数

print(".....word2vecモデル読み込み中")
# wor2vecモデル読み込み   :  絶対パス
#model_path = "D:\\Desktop\\研究B4\\小林_B4\\プログラムおよびデータ\\02.Google_Colab\\drive\\cc.ja.300.vec.gz"
#model_path = "C:/Users/kobayashi/Desktop/小林_B4/プログラムおよびデータ/02.Google Colab/drive/cc.ja.300.vec.gz"
#model_path = "C:\\Users\\fkddn\\OneDrive\\デスクトップ\\cc.ja.300.vec.gz"
#model_path = "/home/kobayashi/word2vec/cc.ja.300.vec.gz"

#相対パス(relative_path)
model_path = "../word2vec/cc.ja.300.vec.gz"

model = "test_model"  #テストするときのモデル
# model = gensim.models.KeyedVectors.load_word2vec_format(model_path, binary=False) #モデルの読み込み
print(".....word2vecモデル読み込み完了!!")

# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:vector1,aspect2:vector,..},aspectsVector:vector,numOfRev:number,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage}}]
print(".....スポット情報読み込み中")
allpref_spots_info = get_spotinfo()
print(".....スポット情報読み込み完了!!")

print(".....クラスタリング情報読み込み中")
allpref_clusters_info = get_clusterinfo()
print(".....クラスタリング情報読み込み完了!!")

print(".....メジャーマイナー観点情報読み込み中")
allpref_majorminer_info = get_majorminer_info()
print(".....メジャーマイナー観点情報読み込み完了!!")


list_spots = []
returned_aspect_list = []
returned_distance_range = 0

app = Flask(__name__)

@app.route("/", methods= ["POST",'GET'])
def start_page():
    print("server sucsess")
    return render_template("start_travel_recommend.html")

@app.route("/<pref>", methods=["POST","GET"])
def return_pref_html(pref):
    print(f"{pref} html")
    return render_template("travel_recommend.html",pref=pref) 

@app.route("/get_prefLatLng", methods=["POST"])
def get_prefLatLng():
    data = request.get_json()
    pref = data.get('pref')
    print(f"select : {pref}")
    startLatLng_path = "./data_beta/start_latlng/start_latlng.csv"
    with open(startLatLng_path,"r",encoding="UTF-8") as f_r:
        reader = csv.reader(f_r)
        for row in reader:
            print(row)
            pref_r = row[0]
            lat = float(row[1])
            lng = float(row[2])
            if pref_r == pref:
                return {"pref":pref,"start_lat": lat , "start_lng":lng}
    return {"pref":"Error","start_lat": 0 , "start_lng":0}

@app.route("/get_recommended_spots",methods=["POST"])
def get_recommended_spots():
    data = request.get_json()
    lat = float(data.get('clicked_lat'))
    lng = float(data.get('clicked_lng'))
    pref = data.get("selected_pref").replace("県","").replace("府","").replace("都","")
    rec_range = int(data.get('range'))
    selected_aspects = data.get('selected_aspects')
    selected_styles = data.get("selected_style").split("\n")
    selected_spots = data.get("selectedSpots")
    popularity_type_value = data.get("popularityType")
    popularity_types = {
        "0": "穴場",
        "1": "普通",
        "2": "有名"
    }
    popularity_type = popularity_types[popularity_type_value]
    print(f"lat : {lat}\nlng : {lng}\npref : {pref}\nrec_range : {rec_range}\n selected_aspects : {selected_aspects}\n selected_styles: {selected_styles}\n selected_spots: {selected_spots}\n 人気度考慮タイプ: {popularity_type}")
    spots_info = allpref_spots_info[pref]
    cluster_info = allpref_clusters_info[pref]
    
    #返却形式は[(spot_name,{"lat":lat,"lng":lng,"aspects":{aspect1:{senti_score:senti_score,count:count},..},"similar_aspects":{},major_aspects:{},miner_aspects:{},"score":score,"spot_url":url}),(spot_name,{}), ...]
    recommend_spots = return_spot(lat,lng,rec_range,selected_aspects,allpref_spots_info,cluster_info,selected_styles,selected_spots,popularity_type,pref,top_n) 
    
    print("recommend_spots: ", recommend_spots[:1],"等")
    response_data = []
    #    response_data = {'spot_name': sp_info[0] , 'lat': sp_info[1][0], 'lng': sp_info[1][1], "distance": sp_info[-1] }
    for recommend_spot in recommend_spots:
        converted_data = {
            "spot_name" : recommend_spot[0],
            "lat" : recommend_spot[1]["lat"],
            "lng" : recommend_spot[1]["lng"],
            "aspects" : recommend_spot[1]["aspects"],
            "similar_aspects" : recommend_spot[1]["similar_aspects"],
            "major_aspects" :recommend_spot[1]["major_aspects"],
            "miner_aspects" :recommend_spot[1]["miner_aspects"],
            "score" : recommend_spot[1]["score"],
            "url" : recommend_spot[1]["spot_url"]
        }
        response_data.append(converted_data)
        # print("converted_data : ",converted_data)
    return jsonify(response_data)

@app.route("/get_random_spot",methods=["POST"])
def get_random_spot():
    global list_spots
    data=request.get_json()
    pref = data.get("selected_pref").replace("県","").replace("府","").replace("都","")
    print(f"get_random_spot selected_pref:{pref}")
    if list_spots != []: #計算量を減らすため
        if list_spots[0][0] != pref:
            list_spots = get_other_pref_spot(pref,allpref_spots_info)
    else:
        list_spots = get_other_pref_spot(pref,allpref_spots_info)
    random_spots = random.sample(list_spots[1:], min(len(list_spots[1:]), 15)) 
    return {"random_spots":random_spots}

@app.route("/search_spot", methods=["POST"])
def search_spot():
    global list_spots
    data = request.get_json()
    query = data.get("query")
    pref = data.get("pref").replace("県","").replace("府","").replace("都","")
    if list_spots != []: #計算量を減らすため
        if list_spots[0][0] != pref:
            list_spots = get_other_pref_spot(pref,allpref_spots_info)
    else:
        list_spots = get_other_pref_spot(pref,allpref_spots_info)
    
    # 完全一致するスポットを抽出
    exact_matches = [spot for spot in list_spots[1:] if spot[0] == query]
    # 部分一致するスポットを抽出（完全一致は除く）
    partial_matches = [spot for spot in list_spots[1:] if query in spot[0] and spot[0] != query]
    # 結果を結合：完全一致が先頭に、部分一致が続く
    print(f"検索スポット結果:{exact_matches + partial_matches}")
    return {"search_spots" : exact_matches + partial_matches}
    
    
@app.route("/search_form", methods=["POST"])
def get_search_keyword():
    print("get serach keyword")
    data=request.get_json()
    search_keyword = data.get("search_keyword")
    pref = data.get("selected_pref").replace("県","").replace("府","").replace("都","")
    print("selected_pref : ", pref)
    print("serach_keyword : " ,search_keyword)
    spots_info = allpref_spots_info[pref]
    results = return_aspect(search_keyword,spots_info,aspect_top_n,model)
    checkboxes = [{"label": result, "value": result} for result in results]
    return jsonify({"keyword": checkboxes})

@app.route("/recommend_aspects",methods = ["POST"])
def recommend_aspects():
    print("recommend aspects")
    data=request.get_json()
    pref = data.get("selected_pref").replace("県","").replace("府","").replace("都","")
    print("おすすめ観点クリック> selected_pref : ", pref)
    pref_majorminer_info = allpref_majorminer_info[pref]
    recommended_aspects = popular_aspects(pref_majorminer_info,aspect_top_n)
    return_aspects = [{"label": result, "value": result} for result in recommended_aspects]
    return jsonify({"recommend_aspects": return_aspects})

def parse_args():
    parser = argparse.ArgumentParser(description='Process some arguments.')
    parser.add_argument('--port', dest='port_num', type=int, help='Port number to be assigned')
    args = parser.parse_args()
    return args

def main():
    args = parse_args()
    port_num = args.port_num

    if port_num is not None:
        print(f'Port number is set to {port_num}')
    else:
        port_num = 8000
        print('Port number is not provided.')

    #webbrowser.open('http://localhost:'+ port_num)
    app.run(debug=True,host='0.0.0.0', port=port_num, threaded=True, use_reloader=False)

if __name__ == "__main__":
    main()
    
