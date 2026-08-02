import prisma from './prisma.js';

export async function createNotification({ userId, type, titre, message, lien = null }) {
  try {
    return await prisma.notification.create({
      data: { userId, type, titre, message, lien },
    });
  } catch (error) {
    console.error('[NOTIFY]', error);
    return null;
  }
}

export async function notifyAdmins({ excludeUserId, type, titre, message, lien = null }) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });

  await Promise.all(
    admins.map(admin => createNotification({ userId: admin.id, type, titre, message, lien }))
  );
}
