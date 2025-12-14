import { defineStore } from 'pinia'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
  }),

  getters: {
    isEditor: (state) => {
      if (!state.user) return false
      const role = state.user.role
      if (!role) return false
      
      const roleType = role.type || role.name || ''
      const roleTypeLower = roleType.toLowerCase()
      
      return roleTypeLower === 'editor'
    },
    isAuthenticatedUser: (state) => {
      if (!state.user) return false
      const role = state.user.role
      if (!role) return false
      
      const roleType = role.type || role.name || ''
      const roleTypeLower = roleType.toLowerCase()
      
      return roleTypeLower === 'authenticated'
    },
  },

  actions: {
    async init() {
      const token = api.getToken()
      const user = api.getCurrentUser()
      
      if (token && user) {
        this.token = token
        this.isAuthenticated = true
        
        if (user && (!user.role || !user.role.type)) {
          try {
            const userWithRole = await api.getUserMe()
            if (userWithRole && userWithRole.role) {
              this.user = userWithRole
              localStorage.setItem('user', JSON.stringify(userWithRole))
            } else {
              this.user = user
            }
          } catch (error) {
            console.warn('Could not fetch user with role:', error)
            this.user = user
          }
        } else {
          this.user = user
        }
      }
    },

    async login(identifier, password) {
      try {
        const response = await api.login(identifier, password)
        
        if (!response.jwt || !response.user) {
          return { success: false, error: 'Неверные учетные данные' }
        }
        
        if (response.user.blocked) {
          return { success: false, error: 'Ваш аккаунт заблокирован' }
        }
        
        try {
          const userWithRole = await api.getUserMe()
          if (userWithRole && userWithRole.role) {
            this.user = userWithRole
            this.token = response.jwt
            this.isAuthenticated = true
            localStorage.setItem('user', JSON.stringify(userWithRole))
            return { success: true }
          }
        } catch (error) {
          console.warn('Could not fetch user with role:', error)
        }
        
        this.user = response.user
        this.token = response.jwt
        this.isAuthenticated = true
        return { success: true }
      } catch (error) {
        let errorMessage = 'Ошибка входа'
        
        if (error.status === 403) {
          errorMessage = 'Доступ запрещен. Проверьте настройки permissions в Strapi'
        } else if (error.status === 401) {
          errorMessage = 'Неверный email/имя пользователя или пароль'
        } else if (error.message) {
          errorMessage = error.message
        }
        
        return { success: false, error: errorMessage }
      }
    },

    async register(userData) {
      try {
        const response = await api.register(userData)
        if (response.jwt) {
          try {
            const userWithRole = await api.getUserMe()
            if (userWithRole && userWithRole.role) {
              this.user = userWithRole
              this.token = response.jwt
              this.isAuthenticated = true
              localStorage.setItem('user', JSON.stringify(userWithRole))
              return { success: true }
            }
          } catch (error) {
            console.warn('Could not fetch user with role:', error)
          }
          
          this.user = response.user
          this.token = response.jwt
          this.isAuthenticated = true
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    logout() {
      api.logout()
      this.user = null
      this.token = null
      this.isAuthenticated = false
    },
  },
})

