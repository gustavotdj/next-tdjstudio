'use server';

import { listR2Objects } from 'lib/r2';
import { getServerSession } from 'next-auth';
import { authOptions } from 'app/api/auth/[...nextauth]/route';

export async function getR2Files(path = '', recursive = false) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    return await listR2Objects(path, recursive);
}
