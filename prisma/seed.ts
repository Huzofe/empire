import { PrismaClient } from '@prisma/client'
import { hash } from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create permissions
  const permissions = [
    { key: 'nodes.read', description: 'Read nodes' },
    { key: 'nodes.create', description: 'Create nodes' },
    { key: 'nodes.edit', description: 'Edit nodes' },
    { key: 'nodes.delete', description: 'Delete nodes' },
    { key: 'documents.read', description: 'Read documents' },
    { key: 'documents.write', description: 'Write documents' },
    { key: 'tasks.manage', description: 'Manage tasks' },
    { key: 'finance.read', description: 'Read financial data' },
    { key: 'finance.write', description: 'Write financial data' },
    { key: 'metrics.read', description: 'Read metrics' },
    { key: 'metrics.write', description: 'Write metrics' },
    { key: 'integrations.read', description: 'Read integrations' },
    { key: 'integrations.manage', description: 'Manage integrations' },
    { key: 'integrations.execute', description: 'Execute integration actions' },
    { key: 'ai.use', description: 'Use AI features' },
    { key: 'users.manage', description: 'Manage users' },
    { key: 'settings.manage', description: 'Manage settings' },
  ]

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {},
      create: permission,
    })
  }

  console.log('✓ Created permissions')

  // Create roles
  const ownerRole = await prisma.role.upsert({
    where: { name: 'Owner' },
    update: {},
    create: {
      name: 'Owner',
      description: 'Full access to all features',
    },
  })

  const partnerRole = await prisma.role.upsert({
    where: { name: 'Partner' },
    update: {},
    create: {
      name: 'Partner',
      description: 'Work with strategy, projects, finances, KPI, tasks, AI',
    },
  })

  const viewerRole = await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: {
      name: 'Viewer',
      description: 'Read-only access',
    },
  })

  console.log('✓ Created roles')

  // Assign permissions to Owner (all)
  const allPermissions = await prisma.permission.findMany()
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: permission.id,
      },
    })
  }

  // Assign permissions to Partner (all except user/settings management)
  const partnerPermissions = allPermissions.filter(
    (p) => !p.key.startsWith('users.') && !p.key.startsWith('settings.')
  )
  for (const permission of partnerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: partnerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: partnerRole.id,
        permissionId: permission.id,
      },
    })
  }

  // Assign read permissions to Viewer
  const viewerPermissions = allPermissions.filter((p) => p.key.endsWith('.read'))
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: viewerRole.id,
        permissionId: permission.id,
      },
    })
  }

  console.log('✓ Assigned permissions to roles')

  // Create node types
  const nodeTypes = [
    { key: 'empire', name: 'Empire', icon: '🏛️', color: '#8b5cf6' },
    { key: 'country', name: 'Country', icon: '🌍', color: '#3b82f6' },
    { key: 'city', name: 'City', icon: '🏙️', color: '#06b6d4' },
    { key: 'industry', name: 'Industry', icon: '🏭', color: '#10b981' },
    { key: 'company', name: 'Company', icon: '🏢', color: '#f59e0b' },
    { key: 'business', name: 'Business', icon: '💼', color: '#ef4444' },
    { key: 'branch', name: 'Branch', icon: '🏪', color: '#ec4899' },
    { key: 'direction', name: 'Direction', icon: '🎯', color: '#8b5cf6' },
    { key: 'project', name: 'Project', icon: '📊', color: '#06b6d4' },
    { key: 'innovation', name: 'Innovation', icon: '💡', color: '#f59e0b' },
    { key: 'initiative', name: 'Initiative', icon: '🚀', color: '#10b981' },
    { key: 'experiment', name: 'Experiment', icon: '🧪', color: '#ec4899' },
    { key: 'stage', name: 'Stage', icon: '📈', color: '#3b82f6' },
    { key: 'task', name: 'Task', icon: '✓', color: '#6b7280' },
    { key: 'goal', name: 'Goal', icon: '🎯', color: '#ef4444' },
  ]

  for (const nodeType of nodeTypes) {
    await prisma.nodeType.upsert({
      where: { key: nodeType.key },
      update: {},
      create: nodeType,
    })
  }

  console.log('✓ Created node types')

  // Create first user (owner)
  const passwordHash = await hash('admin123', {
    type: 2, // Argon2id
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })

  const firstUser = await prisma.user.upsert({
    where: { email: 'admin@empire.local' },
    update: {},
    create: {
      email: 'admin@empire.local',
      passwordHash,
      name: 'Administrator',
    },
  })

  // Assign Owner role to first user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: firstUser.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: firstUser.id,
      roleId: ownerRole.id,
    },
  })

  console.log('✓ Created first user: admin@empire.local / admin123')

  // Create root Empire node
  const empireType = await prisma.nodeType.findUnique({
    where: { key: 'empire' },
  })

  if (empireType) {
    const rootNode = await prisma.node.upsert({
      where: { id: 'root-empire-node' },
      update: {},
      create: {
        id: 'root-empire-node',
        title: 'Empire',
        description: 'Корневой узел всей системы',
        typeId: empireType.id,
        status: 'working',
        createdById: firstUser.id,
      },
    })

    // Create primary workspace document for Empire
    await prisma.document.upsert({
      where: { id: 'root-empire-workspace' },
      update: {},
      create: {
        id: 'root-empire-workspace',
        nodeId: rootNode.id,
        title: 'Workspace',
        isPrimary: true,
        createdById: firstUser.id,
        contentJson: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Empire' }],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Добро пожаловать в Empire — центральную систему управления группой бизнесов.',
                },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Начните с создания первой отрасли, компании или проекта.',
                },
              ],
            },
          ],
        },
        plainText: 'Empire. Добро пожаловать в Empire — центральную систему управления группой бизнесов. Начните с создания первой отрасли, компании или проекта.',
      },
    })

    console.log('✓ Created root Empire node')
  }

  console.log('✅ Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
