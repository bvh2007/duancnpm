export default class FeatureStore {
  constructor(api){this.api=api;this.data={favorites:[],ratings:{},comments:{},reports:[],notifications:[]};}
  async sync(){if(!this.api){return this.data;}try{const me=await this.api.get('/features/me');this.data.favorites=(me.favorites||[]).map(String);this.data.notifications=me.notifications||[];}catch{}return this.data;}
  setDocumentRatings(docs=[]){for(const d of docs)this.data.ratings[String(d._id)]={avg:Number(d.ratingAvg)||0,count:Number(d.ratingCount)||0,mine:this.data.ratings[String(d._id)]?.mine||0};}
  isFavorite(id){return this.data.favorites.includes(String(id));}
  async toggleFavorite(id){const r=await this.api.post(`/features/document/${id}/favorite`,{});const k=String(id);if(r.favorite){if(!this.data.favorites.includes(k))this.data.favorites.push(k);}else this.data.favorites=this.data.favorites.filter(x=>x!==k);return r.favorite;}
  getRating(id){return this.data.ratings[String(id)]||{avg:0,count:0,mine:0};}
  async rate(id,score){const r=await this.api.post(`/features/document/${id}/rating`,{score});this.data.ratings[String(id)]=r.rating;return r.rating;}
  comments(id){return this.data.comments[String(id)]||[];}
  async loadDetail(id){const r=await this.api.get(`/features/document/${id}`);this.data.ratings[String(id)]=r.rating;this.data.comments[String(id)]=r.comments||[];return r;}
  async addComment(id,text){const r=await this.api.post(`/features/document/${id}/comments`,{content:text});this.data.comments[String(id)]=r.comments||[];this.data.ratings[String(id)]=r.rating;return r;}
  async addReport(id,reason){return this.api.post(`/features/document/${id}/report`,{reason});}
  notifications(){return this.data.notifications||[];}
  async admin(){return this.api.get('/features/admin');}
  async review(id,approved,reason=''){return this.api.request(`/documents/${id}/review`,{method:'PATCH',body:JSON.stringify({approved,reason})});}
}
