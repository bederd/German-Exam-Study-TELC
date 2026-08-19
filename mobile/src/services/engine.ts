import { getDb } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safely parse JSON strings from SQLite
const safeJSONParse = (str: string | null, fallback: any = null) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      // Fix for JSON strings using single quotes
      return JSON.parse(str.replace(/'/g, '"'));
    } catch(e2) {
      return fallback;
    }
  }
};

export const EngineService = {
  async getCompleted(type: string): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(`@completed_${type}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async markCompleted(type: string, id: string | number) {
    try {
      const key = `@completed_${type}`;
      const stored = await AsyncStorage.getItem(key);
      const list = stored ? JSON.parse(stored) : [];
      if (!list.includes(String(id))) {
        list.push(String(id));
        await AsyncStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      console.error('markCompleted error', e);
    }
  },

  async getLesenRandom(level: string) {
    try {
      const db = getDb();
      const completed = await this.getCompleted('lesen');
      let query = `SELECT * FROM lesen_texts WHERE level=?`;
      let params: any[] = [level];
      
      if (completed.length > 0) {
        query += ` AND id NOT IN (${completed.map(() => '?').join(',')})`;
        params.push(...completed);
      }
      query += ` ORDER BY RANDOM() LIMIT 1`;
      
      let texts = db.getAllSync(query, params);
      
      if (!texts || texts.length === 0) {
        if (completed.length > 0) {
          await AsyncStorage.removeItem('@completed_lesen');
          texts = db.getAllSync(`SELECT * FROM lesen_texts WHERE level=? ORDER BY RANDOM() LIMIT 1`, [level]);
        }
        if (!texts || texts.length === 0) return null;
      }
      
      const text: any = texts[0];
      const fragen = db.getAllSync(`SELECT * FROM lesen_fragen WHERE text_id=?`, [text.id]);
      
      return {
        id: text.id,
        level: text.level,
        titel: text.titel,
        text: text.text,
        quelle: text.quelle,
        fragen: fragen.map((f: any) => ({
          ...f,
          optionen: safeJSONParse(f.optionen, [])
        }))
      };
    } catch (error) {
      console.error('getLesenRandom failed:', error);
      return null;
    }
  },

  async getLesenAll(level: string) {
    try {
      const db = getDb();
      const rows = db.getAllSync(`SELECT id FROM lesen_texts WHERE level=?`, [level]);
      return rows.map((r: any) => r.id);
    } catch (error) {
      console.error('getLesenAll failed:', error);
      return [];
    }
  },

  async getGrammatik(level: string, typ: string, count: number = 5) {
    try {
      const db = getDb();
      const tableMap: Record<string, string> = {
        'luecke': 'grammatik_luecke',
        'konjugation': 'grammatik_konjugation',
        'satzstellung': 'grammatik_satzstellung',
        'text-luecke': 'grammatik_text_luecke',
      };

      const table = tableMap[typ];
      if (!table) return [];

      const completed = await this.getCompleted(`grammatik_${typ}`);
      let query = `SELECT * FROM ${table} WHERE level=?`;
      let params: any[] = [level];
      
      if (completed.length > 0) {
        query += ` AND id NOT IN (${completed.map(() => '?').join(',')})`;
        params.push(...completed);
      }
      query += ` ORDER BY RANDOM() LIMIT ?`;
      params.push(count);

      let rows = db.getAllSync(query, params);
      
      if (!rows || rows.length < count) {
        if (completed.length > 0) {
          await AsyncStorage.removeItem(`@completed_grammatik_${typ}`);
          rows = db.getAllSync(`SELECT * FROM ${table} WHERE level=? ORDER BY RANDOM() LIMIT ?`, [level, count]);
        }
      }
      
      return rows.map((r: any) => {
        const res = { ...r };
        ['optionen', 'woerter', 'word_bank', 'answers'].forEach(field => {
          if (res[field]) {
            res[field] = safeJSONParse(res[field], res[field]);
          }
        });
        return res;
      });
    } catch (error) {
      console.error('getGrammatik failed:', error);
      return [];
    }
  },

  async getHoeren(level: string, count: number = 3) {
    try {
      const db = getDb();
      const completed = await this.getCompleted('hoeren');
      let query = `SELECT * FROM hoeren_texte WHERE level=?`;
      let params: any[] = [level];
      
      if (completed.length > 0) {
        query += ` AND id NOT IN (${completed.map(() => '?').join(',')})`;
        params.push(...completed);
      }
      query += ` ORDER BY RANDOM() LIMIT ?`;
      params.push(count);

      let texts = db.getAllSync(query, params);
      
      if (!texts || texts.length < count) {
        if (completed.length > 0) {
          await AsyncStorage.removeItem('@completed_hoeren');
          texts = db.getAllSync(`SELECT * FROM hoeren_texte WHERE level=? ORDER BY RANDOM() LIMIT ?`, [level, count]);
        }
      }
      
      return texts.map((t: any) => {
        const fragen = db.getAllSync(`SELECT * FROM hoeren_fragen WHERE text_id=?`, [t.id]);
        return {
          ...t,
          fragen: fragen.map((f: any) => ({
            ...f,
            optionen: safeJSONParse(f.optionen, [])
          }))
        };
      });
    } catch (error) {
      console.error('getHoeren failed:', error);
      return [];
    }
  },

  async getSchreiben(level: string) {
    try {
      const db = getDb();
      const completed = await this.getCompleted('schreiben');
      let query = `SELECT * FROM schreiben_themen WHERE level=?`;
      let params: any[] = [level];
      
      if (completed.length > 0) {
        query += ` AND id NOT IN (${completed.map(() => '?').join(',')})`;
        params.push(...completed);
      }
      query += ` ORDER BY RANDOM() LIMIT 1`;

      let rows = db.getAllSync(query, params);
      
      if (!rows || rows.length === 0) {
        if (completed.length > 0) {
          await AsyncStorage.removeItem('@completed_schreiben');
          rows = db.getAllSync(`SELECT * FROM schreiben_themen WHERE level=? ORDER BY RANDOM() LIMIT 1`, [level]);
        }
        if (!rows || rows.length === 0) return null;
      }

      const row: any = rows[0];
      return {
        ...row,
        fragen: safeJSONParse(row.fragen, []),
        tipps: safeJSONParse(row.tipps, [])
      };
    } catch (error) {
      console.error('getSchreiben failed:', error);
      return null;
    }
  },

  async getStats(level: string) {
    try {
      const db = getDb();
      
      const lesenCountObj: any = db.getFirstSync(`SELECT COUNT(*) as c FROM lesen_texts WHERE level=?`, [level]);
      const fragenCountObj: any = db.getFirstSync(`SELECT COUNT(*) as c FROM lesen_fragen f JOIN lesen_texts t ON f.text_id=t.id WHERE t.level=?`, [level]);
      
      const grammatikCountObj: any = db.getFirstSync(`
        SELECT (SELECT COUNT(*) FROM grammatik_luecke WHERE level=?) + 
               (SELECT COUNT(*) FROM grammatik_konjugation WHERE level=?) + 
               (SELECT COUNT(*) FROM grammatik_satzstellung WHERE level=?) as c
      `, [level, level, level]);

      return {
        level,
        lesen_texts: lesenCountObj?.c || 0,
        lesen_fragen: fragenCountObj?.c || 0,
        grammatik_total: grammatikCountObj?.c || 0,
      };
    } catch (error) {
      console.error('getStats failed:', error);
      return null;
    }
  },

  async generateQuickExam(level: string) {
    try {
      const exam: any[] = [];
      
      const lesenRes = await this.getLesenRandom(level);
      if (lesenRes) exam.push({ moduleType: 'lesen', data: lesenRes });

      const hoerenRes = await this.getHoeren(level, 1);
      if (hoerenRes && hoerenRes.length > 0) exam.push({ moduleType: 'hoeren', data: hoerenRes });

      const typen = ['luecke', 'konjugation', 'satzstellung', 'text-luecke'];
      const randTyp = typen[Math.floor(Math.random() * typen.length)];
      const grammatikRes = await this.getGrammatik(level, randTyp, 1);
      if (grammatikRes && grammatikRes.length > 0) exam.push({ moduleType: 'grammatik', subType: randTyp, data: grammatikRes });

      const schreibenRes = await this.getSchreiben(level);
      if (schreibenRes) exam.push({ moduleType: 'schreiben', data: schreibenRes });

      // Sınav sırasını karıştır (isteğe bağlı)
      return exam.sort(() => Math.random() - 0.5);
    } catch (error) {
      console.error('generateQuickExam failed:', error);
      return [];
    }
  }
};
