/** Đăng ký, đăng nhập, đăng xuất. */
export default class AuthService {
  constructor(apiClient, sessionStore) {
    this.api = apiClient;
    this.session = sessionStore;
  }

  get currentUser() {
    return this.session.user;
  }

  async login(email, password) {
    const data = await this.api.post('/auth/login', { email, password });
    this.session.save(data.token, data.user);
    return data.user;
  }

  async register(name, email, password) {
    const data = await this.api.post('/auth/register', { name, email, password });
    this.session.save(data.token, data.user);
    return data.user;
  }

  logout() {
    this.session.clear();
  }
}
