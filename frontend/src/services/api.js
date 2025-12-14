const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

class ApiService {
  constructor() {
    this.baseURL = API_URL
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('jwt')
    const isAuthEndpoint = endpoint.includes('/api/auth/local')
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      
      let data
      try {
        data = await response.json()
      } catch {
        const text = await response.text()
        throw new Error(text || `Ошибка ${response.status}`)
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || data.message || data.error || `Ошибка ${response.status}`
        const error = new Error(errorMessage)
        error.status = response.status
        error.data = data
        throw error
      }

      return data
    } catch (error) {
      if (error.status) {
        throw error
      }
      throw new Error(error.message || 'Ошибка сети')
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request(url)
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }

  async register(userData) {
    const response = await this.request('/api/auth/local/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    
    if (response.jwt && response.user) {
      localStorage.setItem('jwt', response.jwt)
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    
    return response
  }

  async login(identifier, password) {
    const response = await this.request('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({
        identifier,
        password,
      }),
    })
    
    if (response.jwt && response.user) {
      localStorage.setItem('jwt', response.jwt)
      localStorage.setItem('user', JSON.stringify(response.user))
    }
    
    return response
  }

  logout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  getToken() {
    return localStorage.getItem('jwt')
  }

  async getUserMe() {
    try {
      const response = await this.get('/api/users/me', {
        populate: 'role'
      })
      return response
    } catch (error) {
      console.error('Error fetching user me:', error)
      return null
    }
  }

  async getArticles(params = {}) {
    const queryParams = {}
    
    if (params.filters) {
      const buildFilterParams = (obj, prefix = 'filters') => {
        Object.keys(obj).forEach(key => {
          const value = obj[key]
          const newKey = `${prefix}[${key}]`
          
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            if (value.$eq !== undefined) {
              queryParams[`${newKey}[$eq]`] = value.$eq
            } else if (value.$notNull !== undefined) {
              queryParams[`${newKey}[$notNull]`] = value.$notNull
            } else {
              buildFilterParams(value, newKey)
            }
          } else {
            queryParams[newKey] = value
          }
        })
      }
      buildFilterParams(params.filters)
    }
    
    if (params.populate) {
      queryParams.populate = Array.isArray(params.populate) 
        ? params.populate.join(',') 
        : params.populate
    }
    
    if (params.sort) {
      queryParams.sort = Array.isArray(params.sort) 
        ? params.sort.join(',') 
        : params.sort
    }
    
    if (params.pagination) {
      queryParams['pagination[page]'] = params.pagination.page || 1
      queryParams['pagination[pageSize]'] = params.pagination.pageSize || 10
    }

    return this.get('/api/articles', queryParams)
  }

  async getArticle(id, params = {}) {
    const queryParams = {}
    
    if (params.populate) {
      queryParams.populate = Array.isArray(params.populate) 
        ? params.populate.join(',') 
        : params.populate
    }

    return this.get(`/api/articles/${id}`, queryParams)
  }

  async getFeaturedArticles(params = {}) {
    const queryParams = {}
    
    if (params.populate) {
      queryParams.populate = Array.isArray(params.populate) 
        ? params.populate.join(',') 
        : params.populate
    }
    
    if (params.sort) {
      queryParams.sort = Array.isArray(params.sort) 
        ? params.sort.join(',') 
        : params.sort
    }
    
    if (params.pagination) {
      queryParams['pagination[page]'] = params.pagination.page || 1
      queryParams['pagination[pageSize]'] = params.pagination.pageSize || 10
    }

    return this.get('/api/articles/featured', queryParams)
  }

  async getCategories() {
    return this.get('/api/categories')
  }

  async createArticle(articleData) {
    return this.post('/api/articles', { data: articleData })
  }

  async updateArticle(id, articleData) {
    return this.put(`/api/articles/${id}`, articleData)
  }

  async deleteArticle(id) {
    return this.delete(`/api/articles/${id}`)
  }
}

export default new ApiService()

