import gensim
import MeCab
import ipadic
import re
import numpy as np
from collections import defaultdict
import random

def tokenize(text):
    tokenizer = MeCab.Tagger(f"-Owakati {ipadic.MECAB_ARGS}")
    return tokenizer.parse(text).strip().split()

#0:単語(入力値) 1:品詞 2:詳細1 3:詳細2 4:詳細3 5:活用形 6:活用 7:原型 8:読み方 9:発音
def candidates_maker_mecab(str,num) :
    mecab = MeCab.Tagger(f"{ipadic.MECAB_ARGS}")
    candidates_list= []
    mecab_candidates = mecab.parseNBest(num, str).split("EOS")
    mecab_candidates[0] = "\n"+mecab_candidates[0]
    for mecab_candidate in mecab_candidates:
        mecab_splited = mecab_candidate.strip().split("\n")
        candidates_list.append(mecab_splited)
    copy_cand = [[] for i in range(len(candidates_list))]
    for c in range(len(candidates_list)):
        for c2 in candidates_list[c]:
            copy_cand[c].append([a for a in re.split('[\t,]+',c2) if a != ''])
    return copy_cand[:-1]

#品詞判定
def pos_judge(word_info):
    word = word_info[0]
    pos = word_info[1]
    if (pos == "名詞" or pos =="形容動詞" or pos == "形容詞" or pos =="動詞") :
        return True
    return False

def del_stopwords_from_candidates(tokenized_candidate):
    formatted_candidate =[]
    for word_info in tokenized_candidate:
        if pos_judge(word_info):
            formatted_candidate.append(word_info)
    return formatted_candidate

def deduplication(aspect_vector_list):
    aspect_vectors_sum = defaultdict(list)
    # アスペクトごとにベクトルを足し合わせる
    for aspect, vector in aspect_vector_list:
        aspect_vectors_sum[aspect].append(vector)

    # アスペクトごとにベクトルを合計して新しいアスペクトとベクトルを格納するリスト
    result_list = [[aspect, [sum(values) / len(values) for values in zip(*vectors)]] for aspect, vectors in aspect_vectors_sum.items()]
    return result_list


def cos_sim(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
def add_list_int(list1,list2):
    return [x + y for x, y in zip(list1, list2)]
def divide_list_int(list1,num1):
    return [x/num1 for x in list1]


# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
#クエリと似ている観点を返す
# def return_aspect(query,spots_info,aspect_top_n,model):
#     result = []
#     all_aspectsAndvector = []
#     for spot in spots_info:
#         aspects = spot[2]
#         vectors = spot[3]
#         for aspect,vector in zip(aspects,vectors):
#             all_aspectsAndvector.append([aspect,vector])
#     all_aspectsAndvector = deduplication(all_aspectsAndvector)
#     all_aspects_score = calc_aspect_score(query,all_aspectsAndvector,model)

#     sorted_aspect = sorted(zip(all_aspectsAndvector,all_aspects_score), key=lambda x:x[-1],reverse=True)
#     result = [item[0][0] for item in sorted_aspect[:aspect_top_n]]
#     return result

# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:{vector:vector1,spot_url:url,whichFrom:whichFrom,senti_score:senti_score,count:count,count_percentage:count_percentage},aspect2:{vector:vector2,...},..},aspectsVector:vector,numOfRev:number,},...}
# # #テスト関数
def return_aspect(query,spots_info,aspect_top_n,model):
    similar_aspect = []
    kanzen_icchi = []
    for spot_name,spot_info in spots_info.items():
        for aspect,aspect_info in spot_info["aspects"].items():     
            if aspect == query:
                kanzen_icchi.append(aspect)
            elif query in aspect:
                similar_aspect.append(aspect)
    similar_aspect = list(set(kanzen_icchi))+list(set(similar_aspect))
    return similar_aspect[:aspect_top_n]

# spots_info = {spotname:{lat:lat,lng:lng,aspects:{apsect1:vector1,aspect2:vector,..},spots_aspectsVector:vector,spot_numOfRev:number,spot_url:url}}]
def popular_aspects(pref_majorminer_info,n):

    major_list = pref_majorminer_info["major_aspects"]
    miner_list = pref_majorminer_info["miner_aspects"]
    recommend_aspect = random.sample(major_list, k=n)
    return recommend_aspect

def get_random_aspects(spots_info,n):
    all_aspects = []
    for spot_name,spot_info in spots_info.items():
        for aspect,aspect_info in spot_info["aspects"].items():     
            all_aspects.append(aspect)
    random_aspects = random.sample(all_aspects, k=n)
    return random_aspects


def calc_aspect_score(query,all_aspects_vectors,model):
    score_list = []
    tokenized_candidates = del_stopwords_from_candidates(candidates_maker_mecab(query,1)[0])
    query_vector = [0]*300
    for candidate in tokenized_candidates:
        word = candidate[0]
        query_vector = add_list_int(query_vector,model[word])
    query_vector = divide_list_int(query_vector,len(tokenized_candidates))
    for aspect,vector in all_aspects_vectors:
        similarity = cos_sim(query_vector,vector)
        score_list.append(similarity)
    return score_list
