import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const toMap = (settings: { key: string; value: string }[]) =>
  settings.reduce<Record<string, string>>((acc, s) => { acc[s.key] = s.value; return acc; }, {});

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    successResponse(res, toMap(await prisma.siteSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] })));
  } catch { errorResponse(res, 'Failed to fetch settings', 500); }
}

export async function getSettingsByGroup(req: Request, res: Response): Promise<void> {
  try {
    successResponse(res, toMap(await prisma.siteSetting.findMany({ where: { group: req.params.group }, orderBy: { key: 'asc' } })));
  } catch { errorResponse(res, 'Failed to fetch settings', 500); }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const settings = req.body as Record<string, string>;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      errorResponse(res, 'Settings must be a key-value object', 400);
      return;
    }

    const KEY_REGEX = /^[a-zA-Z0-9_\-\.]{1,64}$/;
    for (const [key, value] of Object.entries(settings)) {
      if (!KEY_REGEX.test(key)) {
        errorResponse(res, `Invalid setting key format: "${key}"`, 400);
        return;
      }
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        errorResponse(res, `Invalid setting value for key: "${key}"`, 400);
        return;
      }
    }

    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.siteSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value), group: 'general' } })
      )
    );
    successResponse(res, null, 'Settings updated');
  } catch (error) {
    console.error('Update settings error:', error);
    errorResponse(res, 'Failed to update settings', 500);
  }
}

export async function uploadLogo(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    // Automatically crop uploaded logo image safely using child_process.execFileSync without shell interpolation
    try {
      const scriptPath = path.join(process.cwd(), 'src', 'utils', 'crop_image.py');
      const filePath = path.resolve(req.file.path);
      console.log(`[Auto-Crop] Running logo cropping on: ${filePath}`);
      execFileSync('python', [scriptPath, filePath], { stdio: 'pipe' });
      console.log('[Auto-Crop] Logo cropped successfully');
    } catch (cropError) {
      console.error('[Auto-Crop] Failed to crop logo:', cropError);
    }

    let logoPath = `/api/uploads/logo/${req.file.filename}`;
    try {
      const buffer = fs.readFileSync(req.file.path);
      logoPath = `data:${req.file.mimetype || 'image/png'};base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.error('Error reading logo buffer for base64:', e);
    }
    
    // Update database
    await prisma.siteSetting.upsert({
      where: { key: 'site_logo' },
      update: { value: logoPath },
      create: { key: 'site_logo', value: logoPath, group: 'general' }
    });
    
    successResponse(res, { site_logo: logoPath }, 'Logo uploaded successfully');
  } catch (error) {
    console.error('Upload logo error:', error);
    errorResponse(res, 'Failed to upload logo', 500);
  }
}

export async function recordVisit(_req: Request, res: Response): Promise<void> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'visitor_count' } });
    const currentCount = setting ? parseInt(setting.value, 10) || 0 : 0;
    const newCount = currentCount + 1;
    await prisma.siteSetting.upsert({
      where: { key: 'visitor_count' },
      update: { value: String(newCount) },
      create: { key: 'visitor_count', value: String(newCount), group: 'analytics', label: 'Total Website Visitors' },
    });
    successResponse(res, { count: newCount });
  } catch (error) {
    console.error('Record visit error:', error);
    errorResponse(res, 'Failed to record visit', 500);
  }
}

export async function getVisitStats(_req: Request, res: Response): Promise<void> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'visitor_count' } });
    const count = setting ? parseInt(setting.value, 10) || 0 : 0;
    successResponse(res, { count });
  } catch (error) {
    errorResponse(res, 'Failed to get visit stats', 500);
  }
}

export async function resetVisitCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const newCount = typeof req.body?.count === 'number' ? req.body.count : 0;
    await prisma.siteSetting.upsert({
      where: { key: 'visitor_count' },
      update: { value: String(newCount) },
      create: { key: 'visitor_count', value: String(newCount), group: 'analytics', label: 'Total Website Visitors' },
    });
    successResponse(res, { count: newCount }, 'Visitor counter reset successfully');
  } catch (error) {
    console.error('Reset visit count error:', error);
    errorResponse(res, 'Failed to reset visit count', 500);
  }
}
