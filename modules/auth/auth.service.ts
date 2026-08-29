import { hash, verify } from 'argon2'
import { prisma } from '@/lib/db'

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      type: 2, // Argon2id
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    })
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await verify(hash, password)
    } catch {
      return false
    }
  }

  async createUser(email: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      throw new Error('User with this email already exists')
    }

    const passwordHash = await this.hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    })

    // Assign default role (viewer)
    const viewerRole = await prisma.role.findUnique({
      where: { name: 'Viewer' },
    })

    if (viewerRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: viewerRole.id,
        },
      })
    }

    return user
  }

  async authenticateUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || user.deletedAt) {
      return null
    }

    const isValid = await this.verifyPassword(user.passwordHash, password)
    if (!isValid) {
      return null
    }

    // Extract permissions
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.key)
    )

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      roles: user.roles.map((ur) => ur.role.name),
      permissions: Array.from(new Set(permissions)),
    }
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || user.deletedAt) {
      return false
    }

    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.key)
    )

    return permissions.includes(permission)
  }
}

export const authService = new AuthService()
