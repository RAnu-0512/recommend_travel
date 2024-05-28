from flask import Flask, render_template, jsonify, request, url_for,redirect
import webbrowser
import gensim
from read_sp_info import get_spotinfo
from return_aspect import return_aspect,popular_aspects
from calculate_distance import calc_near_spot
from return_spot import return_spot
import argparse
import csv

top_n = 10 #推薦スポット数
aspect_top_n = 10 #ヒットする観点数

print(".....モデル読み込み中")
# wor2vecモデル読み込み   :  絶対パス
#model_path = "D:\\Desktop\\研究B4\\小林_B4\\プログラムおよびデータ\\02.Google_Colab\\drive\\cc.ja.300.vec.gz"
#model_path = "C:/Users/kobayashi/Desktop/小林_B4/プログラムおよびデータ/02.Google Colab/drive/cc.ja.300.vec.gz"
#model_path = "C:\\Users\\fkddn\\OneDrive\\デスクトップ\\cc.ja.300.vec.gz"
#model_path = "/home/kobayashi/word2vec/cc.ja.300.vec.gz"

#相対パス(relative_path)
model_path = "../word2vec/cc.ja.300.vec.gz"

model = "test_model"  #テストするときのモデル
model = gensim.models.KeyedVectors.load_word2vec_format(model_path, binary=False) #モデルの読み込み
print(".....モデル読み込み完了!!")

#allpref_spots_info = {pref : [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1],[spots_aspectsVector_float_1],spot_numOfRev,spot_url], ... ] , pref : , ...}
allpref_spots_info = get_spotinfo()
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
    startLatLng_path = "data/start_latlng/start_latlng.csv"
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
    lat = float(data.get('cliked_lat'))
    lng = float(data.get('cliked_lng'))
    pref = data.get("selected_pref").replace("県","").replace("府","").replace("都","")
    rec_range = int(data.get('range'))
    selected_aspects = data.get('selected_aspects')
    print(f"lat : {lat}\nlng : {lng}\npref : {pref}\nrec_range : {rec_range}\n selected_aspects : {selected_aspects}")
    spots_info = allpref_spots_info[pref]
    recommend_spots = return_spot(lat,lng,rec_range,selected_aspects,spots_info,pref,top_n) #形式 : [[spot_name,[lat,lng],aspects,[similar_aspect],score,url], ...]
    print("recommend_spots: ", recommend_spots)
    response_data = []
    #    response_data = {'spot_name': sp_info[0] , 'lat': sp_info[1][0], 'lng': sp_info[1][1], "distance": sp_info[-1] }
    for recommend_spot in recommend_spots:
        converted_data = {
            "spot_name" : recommend_spot[0],
            "lat" : recommend_spot[1][0],
            "lng" : recommend_spot[1][1],
            "aspects" : recommend_spot[2],
            "similar_aspects" : recommend_spot[3],
            "score" : recommend_spot[4],
            "url" : recommend_spot[5]
        }
        response_data.append(converted_data)
        # print("converted_data : ",converted_data)
    return jsonify(response_data)

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
    print("selected_pref : ", pref)
    spots_info = allpref_spots_info[pref]
    recommended_aspects = popular_aspects(spots_info,aspect_top_n)
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
    
