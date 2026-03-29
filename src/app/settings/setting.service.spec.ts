import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { SettingsService } from './setting.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('dark mode', () => {
    it('should default to Auto (0)', () => {
      expect(service.dark()).toBe(0);
    });

    it('should return dark level 0.2 when set to Dark (2)', () => {
      service.dark.set(2); // Dark
      TestBed.flushEffects();
      expect(service.darkLevel()).toBe(0.2);
    });

    it('should return dark level 1 when set to Light (1)', () => {
      service.dark.set(1); // Light
      TestBed.tick()
      expect(service.darkLevel()).toBe(1);
    });

    it('effectiveDark should be true when darkLevel <= 0.5', () => {
      service.dark.set(2); // Dark → darkLevel 0.2
      TestBed.tick()
      expect(service.effectiveDark()).toBe(true);
    });

    it('effectiveDark should be false when darkLevel > 0.5', () => {
      service.dark.set(1); // Light → darkLevel 1
      TestBed.tick()
      expect(service.effectiveDark()).toBe(false);
    });

    it('should toggle dark class on documentElement', () => {
      service.dark.set(2); // Dark
      TestBed.tick()
      expect(doc.documentElement.classList.contains('dark')).toBe(true);

      service.dark.set(1); // Light
      TestBed.tick()
      expect(doc.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('FPS settings', () => {
    it('should default fpsLimit to 60', () => {
      expect(service.fpsLimit()).toBe(60);
    });

    it('should default showFps to false', () => {
      expect(service.showFps()).toBe(false);
    });

    it('should update fpsLimit', () => {
      service.fpsLimit.set(120);
      expect(service.fpsLimit()).toBe(120);
    });
  });

  describe('effectiveSettings', () => {
    it('should combine dark level and fps limit', () => {
      service.dark.set(2);
      service.fpsLimit.set(180);
      TestBed.flushEffects();

      const settings = service.effectiveSettings();
      expect(settings.dark).toBe(0.2);
      expect(settings.fpsLimit).toBe(180);
    });
  });
});
