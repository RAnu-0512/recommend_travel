import MeCab
import ipadic
import re
from collections import defaultdict
import numpy as np


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

def calc_aspect_score(query,all_aspects,model):
    score_list = []
    for aspect in all_aspects:
        score = 0
        if query in aspect:
            score = score + 1
        score_list.append(score)
    return score_list



def deduplication(aspect_vector_list):
    aspect_vectors_sum = defaultdict(list)
    # アスペクトごとにベクトルを足し合わせる
    for aspect, vector in aspect_vector_list:
        aspect_vectors_sum[aspect].append(vector)

    # アスペクトごとにベクトルを合計して新しいアスペクトとベクトルを格納するリスト
    result_list = [[aspect, [sum(values) / len(values) for values in zip(*vectors)]] for aspect, vectors in aspect_vectors_sum.items()]

    print(result_list)
    return result_list

def cos_sim(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
def add_list_int(list1,list2):
    return [x + y for x, y in zip(list1, list2)]
def divide_list_int(list1,num1):
    return [x/num1 for x in list1]
def calc_aspect_score(query,all_aspects_vectors):
    score_list = []
    tokenized_candidates = del_stopwords_from_candidates(candidates_maker_mecab(query,1)[0])
    query_vector = [0,0,0]
    for candidate in tokenized_candidates:
        word = candidate[0]
        query_vector = add_list_int(query_vector,[1,2,3])
    query_vector = divide_list_int(query_vector,len(tokenized_candidates))
    for aspect,vector in all_aspects_vectors:
        similarity = cos_sim(query_vector,vector)
        score_list.append(similarity)
    return score_list

words = "観光できる"
all_aspectsAndvector = [
    ["自然", [3, 4, 7]],
    ["観光", [1, 2, 4]],
    ["適当", [1, 2, 3]]
]


all_aspects_score = calc_aspect_score(words,all_aspectsAndvector)
print(all_aspects_score)

sorted_aspect = sorted(zip(all_aspectsAndvector,all_aspects_score), key=lambda x:x[-1],reverse=True)
print(sorted_aspect)
result = [item[0][0] for item in sorted_aspect[:2]]
print(result)