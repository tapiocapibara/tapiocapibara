/* ---------- Language support: English (EN) / Thai (ไทย) ----------
   English text stays in the code as the source string; tr('English text') returns the Thai version when Thai is selected.
   Strings with {placeholders} are filled from the second argument: tr('Maximum {n} photos per post.',{n:4}).
   The chosen language is saved in localStorage (read before the first paint) and in the app database (meta 'lang'). */
const LANG_KEY='its-me-lang';
let LANG='en';
try{const s=localStorage.getItem(LANG_KEY);if(s==='th'||s==='en')LANG=s}catch(e){}

const TH={
/* page + profile */
'It’s me – Private Diary':'It’s me – ไดอารี่ส่วนตัว',
'Me':'ฉัน','My private diary.':'ไดอารี่ส่วนตัวของฉัน',
'Change banner':'เปลี่ยนแบนเนอร์','Display name':'ชื่อที่แสดง','Bio':'ประวัติย่อ',
'post':'โพสต์','posts':'โพสต์',
'Save':'บันทึก','Cancel':'ยกเลิก','Close':'ปิด','Remove':'ลบ','Reset':'รีเซ็ต','Delete':'ลบ','Upload':'อัปโหลด','Import':'นำเข้า','Post':'โพสต์',
'Edit image':'แก้ไขรูปภาพ','Animated GIFs can’t be edited.':'ไม่สามารถแก้ไข GIF แบบเคลื่อนไหวได้','Change cover':'เปลี่ยนปก','Highlight name':'ชื่อไฮไลต์','Image {i} of {n}':'รูปภาพ {i} จาก {n}','Original':'ต้นฉบับ','Free':'อิสระ','Zoom':'ซูม','Zoom in':'ซูมเข้า','Zoom out':'ซูมออก','Aspect ratio':'สัดส่วนภาพ','Crop area':'พื้นที่ครอป',
'This image can’t be edited here, so it will be used as it is.':'ไม่สามารถแก้ไขรูปภาพนี้ได้ ระบบจะใช้รูปภาพต้นฉบับแทน','Could not save the edited image.':'ไม่สามารถบันทึกรูปภาพที่แก้ไขได้',
'Customization':'การปรับแต่ง',
'Reset icon':'รีเซ็ตไอคอน','Edit profile':'แก้ไขโปรไฟล์','New':'ใหม่',
/* moods */
'Happy':'มีความสุข','Calm':'สงบ','Neutral':'เฉยๆ','Sad':'เศร้า','Stressed':'เครียด','Excited':'ตื่นเต้น',
'Mood':'อารมณ์','Choose mood':'เลือกอารมณ์','Mood badge':'ป้ายอารมณ์','(Tag) badge':'ป้าย (แท็ก)','Reset color':'รีเซ็ตสี',
'Another mood already uses that name.':'มีอารมณ์อื่นใช้ชื่อนี้อยู่แล้ว',
/* highlights */
'New highlight':'ไฮไลต์ใหม่','Title':'ชื่อเรื่อง','cover':'ปก','Choose cover (image / GIF)':'เลือกปก (รูปภาพ / GIF)',
'Previous':'ก่อนหน้า','Next':'ถัดไป','No photos yet':'ยังไม่มีรูปภาพ','+ Add photos':'+ เพิ่มรูปภาพ',
'Delete photo':'ลบรูปภาพ','Delete album':'ลบอัลบั้ม','Delete this highlight album?':'ลบอัลบั้มไฮไลต์นี้หรือไม่?',
'Add a title and a cover image.':'โปรดเพิ่มชื่อเรื่องและรูปปก',
/* composer + media */
'How was your day?':'วันนี้เป็นอย่างไรบ้าง?','Add photos':'เพิ่มรูปภาพ','Add a video':'เพิ่มวิดีโอ','Voice note':'บันทึกเสียง',
'● Recording…':'● กำลังบันทึกเสียง…','(add tag) ⏎':'(เพิ่มแท็ก) ⏎','Remove tag':'ลบแท็ก','(tags) separated by spaces':'(แท็ก) คั่นด้วยการเว้นวรรค',
'Video':'วิดีโอ','photo':'รูปภาพ','video':'วิดีโอ','photos':'รูปภาพ','tap × to remove':'แตะ × เพื่อลบ','limit reached':'ถึงขีดจำกัดแล้ว',
'Up to {n} photos or videos per post':'สูงสุด {n} รูปภาพหรือวิดีโอต่อโพสต์',
'Microphone access was denied or is unavailable.':'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน หรือไม่สามารถใช้ไมโครโฟนได้',
'Remove photos and videos to record a voice note.':'ลบรูปภาพและวิดีโอก่อน จึงจะบันทึกเสียงได้',
'Remove photos and videos to record a voice note':'ลบรูปภาพและวิดีโอเพื่อบันทึกเสียง',
'Remove the voice note to add photos or videos.':'ลบบันทึกเสียงก่อน จึงจะเพิ่มรูปภาพหรือวิดีโอได้',
'Remove the voice note to add photos or videos':'ลบบันทึกเสียงเพื่อเพิ่มรูปภาพหรือวิดีโอ',
'Voice note attached · photos and videos are unavailable':'แนบบันทึกเสียงแล้ว · ไม่สามารถเพิ่มรูปภาพและวิดีโอได้',
'Maximum {n} photos per post.':'ใส่รูปภาพได้สูงสุด {n} รูปต่อโพสต์',
'Only 1 video per post.':'ใส่วิดีโอได้เพียง 1 รายการต่อโพสต์',
'Choose either photos or one video, not both.':'เลือกรูปภาพหรือวิดีโอ 1 รายการอย่างใดอย่างหนึ่ง ไม่สามารถเลือกทั้งสองอย่างได้',
'A voice note can’t be combined with photos or videos.':'ไม่สามารถใช้บันทึกเสียงร่วมกับรูปภาพหรือวิดีโอได้',
'Maximum {n} photos and videos per post.':'ใส่รูปภาพและวิดีโอได้สูงสุด {n} รายการต่อโพสต์',
'A voice note can’t be combined with photos or videos. Remove one to continue.':'ไม่สามารถใช้บันทึกเสียงร่วมกับรูปภาพหรือวิดีโอได้ โปรดลบอย่างใดอย่างหนึ่งเพื่อดำเนินการต่อ',
'“{name}” is not a {kind}.':'“{name}” ไม่ใช่{kind}',
'Maximum {n} photos and videos per post — extra files were skipped.':'ใส่รูปภาพและวิดีโอได้สูงสุด {n} รายการต่อโพสต์ — ข้ามไฟล์ส่วนเกินแล้ว',
'Maximum {n} photos per post — extra photos were skipped.':'ใส่รูปภาพได้สูงสุด {n} รูปต่อโพสต์ — ข้ามรูปภาพส่วนเกินแล้ว',
'Limit reached ({n}/{max})':'ถึงขีดจำกัดแล้ว ({n}/{max})',
'Add photos ({n}/{max})':'เพิ่มรูปภาพ ({n}/{max})',
'Add a video ({n}/{max})':'เพิ่มวิดีโอ ({n}/{max})',
'Remove the video to add photos.':'ลบวิดีโอก่อน จึงจะเพิ่มรูปภาพได้',
'Remove the photos to add a video.':'ลบรูปภาพก่อน จึงจะเพิ่มวิดีโอได้',
'Discard this post? (Use Drafts to keep it instead.)':'ละทิ้งโพสต์นี้หรือไม่? (ใช้ “แบบร่าง” เพื่อเก็บไว้แทนได้)',
/* drafts */
'Drafts':'แบบร่าง','Drafts ({n})':'แบบร่าง ({n})','Save current post as draft':'บันทึกโพสต์ปัจจุบันเป็นแบบร่าง','(media only)':'(เฉพาะสื่อ)',
'No drafts yet.':'ยังไม่มีแบบร่าง','Delete draft':'ลบแบบร่าง','Replace what you are writing with this draft?':'แทนที่สิ่งที่คุณกำลังเขียนด้วยแบบร่างนี้หรือไม่?',
/* feed + posts + threads */
'Read more…':'อ่านเพิ่มเติม…','Show less':'แสดงน้อยลง','View full post':'ดูโพสต์ทั้งหมด',
'Add another post':'เพิ่มโพสต์อื่น','Add another post…':'เพิ่มโพสต์อื่น…','Add another post to this thread':'เพิ่มโพสต์อื่นในเธรดนี้',
'More options':'ตัวเลือกเพิ่มเติม','Edit post':'แก้ไขโพสต์','Remove this post':'ลบโพสต์นี้','Stop recording':'หยุดบันทึกเสียง',
'● Recording… tap the mic to stop':'● กำลังบันทึกเสียง… แตะไมโครโฟนเพื่อหยุด',
'Delete this post?':'ลบโพสต์นี้หรือไม่?','This will permanently delete this post.':'โพสต์นี้จะถูกลบอย่างถาวร',
'The other posts in the thread will stay.':'โพสต์อื่นในเธรดจะยังคงอยู่',
'An entry needs some text or media.':'บันทึกต้องมีข้อความหรือสื่ออย่างน้อยหนึ่งอย่าง',
'Could not save the post. Please try again.':'ไม่สามารถบันทึกโพสต์ได้ โปรดลองอีกครั้ง',
'No entries yet. Write your first one above ✍️':'ยังไม่มีบันทึก เขียนบันทึกแรกของคุณด้านบนได้เลย ✍️',
'No entries on this day.':'ไม่มีบันทึกในวันนี้',
'Tap a date to see that day’s entries.':'แตะวันที่เพื่อดูบันทึกของวันนั้น',
'Each day shows up to 4 most-logged moods (most frequent first).':'แต่ละวันจะแสดงอารมณ์ที่บันทึกบ่อยที่สุดสูงสุด 4 แบบ (เรียงจากบ่อยที่สุด)',
/* tabs + viewers */
'All':'ทั้งหมด','Photos':'รูปภาพ','Videos':'วิดีโอ',
'No photos yet. Photos you add to posts appear here.':'ยังไม่มีรูปภาพ รูปภาพที่คุณเพิ่มในโพสต์จะแสดงที่นี่',
'No videos yet. Videos you add to posts appear here.':'ยังไม่มีวิดีโอ วิดีโอที่คุณเพิ่มในโพสต์จะแสดงที่นี่',
'Open photo':'เปิดรูปภาพ','Play video':'เล่นวิดีโอ','Newer photo':'รูปภาพที่ใหม่กว่า','Older photo':'รูปภาพที่เก่ากว่า',
'Seek video':'เลื่อนตำแหน่งวิดีโอ','Pause':'หยุดชั่วคราว','Play':'เล่น','Mute':'ปิดเสียง','Unmute':'เปิดเสียง',
/* navigation + static labels */
'Timeline':'ไทม์ไลน์','Create post':'สร้างโพสต์','Calendar':'ปฏิทิน','Profile and settings':'โปรไฟล์และการตั้งค่า','Settings':'การตั้งค่า',
'Back to All':'กลับไปที่ทั้งหมด','Profile content':'เนื้อหาโปรไฟล์',
/* settings */
'Language':'ภาษา','Switch between Thai and English':'สลับระหว่างภาษาไทยและภาษาอังกฤษ',
'Theme':'ธีม','Dark mode':'โหมดมืด','Light mode':'โหมดสว่าง','Switch light / dark theme':'สลับธีมสว่าง / มืด',
'Accent color':'สีเน้น','Mood icons':'ไอคอนอารมณ์','Mood name':'ชื่ออารมณ์','Double-click to rename':'ดับเบิลคลิกเพื่อเปลี่ยนชื่อ',
'Default (tag) badge color':'สีป้ายเริ่มต้น (แท็ก)','Used for posts without a custom tag color':'ใช้กับโพสต์ที่ไม่ได้ตั้งสีแท็กเอง',
'Backup & restore':'สำรองและกู้คืนข้อมูล',
'It’s me has no accounts. Your diary is stored only in this browser, so back it up regularly. A backup holds all posts, threads, photos, videos, voice notes, highlights, drafts, your profile and settings.':'It’s me ไม่มีระบบบัญชี ไดอารี่ของคุณถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น จึงควรสำรองข้อมูลเป็นประจำ ไฟล์สำรองประกอบด้วยโพสต์ เธรด รูปภาพ วิดีโอ บันทึกเสียง ไฮไลต์ แบบร่าง โปรไฟล์ และการตั้งค่าทั้งหมดของคุณ',
'Back Up Data':'สำรองข้อมูล','Import Backup':'นำเข้าข้อมูลสำรอง','Export diary to PDF':'ส่งออกไดอารี่เป็น PDF',
'Use a PNG, JPG, JPEG or GIF image.':'โปรดใช้รูปภาพ PNG, JPG, JPEG หรือ GIF',
'Image is {w}×{h}px. Maximum is {max}×{max}px.':'รูปภาพมีขนาด {w}×{h} พิกเซล ขนาดสูงสุดคือ {max}×{max} พิกเซล',
'Could not read this image.':'ไม่สามารถอ่านรูปภาพนี้ได้',
/* backup / import / PDF */
'media file':'ไฟล์สื่อ','media files':'ไฟล์สื่อ','highlight album':'อัลบั้มไฮไลต์','highlight albums':'อัลบั้มไฮไลต์','draft':'แบบร่าง','drafts':'แบบร่าง',
'in threads':'ในเธรด',
'Preparing your backup… this can take a moment if you have many photos or videos.':'กำลังเตรียมไฟล์สำรอง… อาจใช้เวลาสักครู่หากมีรูปภาพหรือวิดีโอจำนวนมาก',
'Backup created: {name} ({posts} {pw}, {media} {mw}, {size}). Your browser is downloading it — check your Downloads folder and keep the file somewhere safe.':'สร้างไฟล์สำรองแล้ว: {name} ({posts} {pw}, {media} {mw}, {size}) เบราว์เซอร์กำลังดาวน์โหลดไฟล์ โปรดตรวจสอบโฟลเดอร์ดาวน์โหลดและเก็บไฟล์ไว้ในที่ปลอดภัย',
'Backup failed: something went wrong while preparing the file (the device may be low on memory). Close other tabs and try again. Your data in It’s me was not changed.':'สำรองข้อมูลไม่สำเร็จ: เกิดข้อผิดพลาดขณะเตรียมไฟล์ (อุปกรณ์อาจมีหน่วยความจำไม่เพียงพอ) โปรดปิดแท็บอื่นแล้วลองอีกครั้ง ข้อมูลใน It’s me ไม่มีการเปลี่ยนแปลง',
'Reading {name}…':'กำลังอ่าน {name}…',
'That file could not be read as a It’s me backup (it is not valid JSON, or it is damaged). Nothing was changed.':'ไม่สามารถอ่านไฟล์นี้เป็นไฟล์สำรองของ It’s me ได้ (ไม่ใช่ JSON ที่ถูกต้อง หรือไฟล์เสียหาย) ไม่มีการเปลี่ยนแปลงใดๆ',
'That is not a It’s me backup file. Choose a .json file created with “Back Up Data”. Nothing was changed.':'นี่ไม่ใช่ไฟล์สำรองของ It’s me โปรดเลือกไฟล์ .json ที่สร้างจาก “สำรองข้อมูล” ไม่มีการเปลี่ยนแปลงใดๆ',
'That backup was made by a newer version of It’s me. Update the app, then try again. Nothing was changed.':'ไฟล์สำรองนี้สร้างจาก It’s me เวอร์ชันที่ใหม่กว่า โปรดอัปเดตแอปแล้วลองอีกครั้ง ไม่มีการเปลี่ยนแปลงใดๆ',
'Post {n} in this backup is damaged (missing ID or date), so nothing was imported.':'โพสต์ที่ {n} ในไฟล์สำรองนี้เสียหาย (ไม่มี ID หรือวันที่) จึงไม่มีการนำเข้าข้อมูล',
'Import this backup?':'นำเข้าไฟล์สำรองนี้หรือไม่?',
'It contains {n} {pw}{th}. Posts with the same ID are replaced by the backed-up version; everything else you have now is kept.':'ไฟล์นี้มี {n} {pw}{th} โพสต์ที่มี ID เดียวกันจะถูกแทนที่ด้วยเวอร์ชันจากไฟล์สำรอง ส่วนข้อมูลอื่นที่คุณมีอยู่จะยังคงไว้',
'Import cancelled. Nothing was changed.':'ยกเลิกการนำเข้าแล้ว ไม่มีการเปลี่ยนแปลงใดๆ',
'Importing… please keep this page open.':'กำลังนำเข้า… โปรดเปิดหน้านี้ไว้',
'Import complete: {np} {pw}{th}, {nh} {hw} and {nd} {dw} restored, plus your profile and settings. Anything you had that is not in the backup was kept.':'นำเข้าเสร็จสมบูรณ์: {np} {pw}{th}, {nh} {hw} และ {nd} {dw} ถูกกู้คืนแล้ว พร้อมโปรไฟล์และการตั้งค่าของคุณ ข้อมูลที่คุณมีอยู่แต่ไม่ได้อยู่ในไฟล์สำรองจะยังคงอยู่',
'({n} in threads, order and dates kept)':'({n} ในเธรด คงลำดับและวันที่ไว้)',
'{n} media item was empty in the file and skipped.':'{n} รายการสื่อในไฟล์ว่างเปล่าและถูกข้าม',
'{n} media items were empty in the file and skipped.':'{n} รายการสื่อในไฟล์ว่างเปล่าและถูกข้าม',
'Import failed: something went wrong while restoring the backup. Your existing data was not deleted. Try again, and make sure the file is a complete, unedited It’s me backup.':'นำเข้าไม่สำเร็จ: เกิดข้อผิดพลาดขณะกู้คืนไฟล์สำรอง ข้อมูลเดิมของคุณไม่ถูกลบ โปรดลองอีกครั้ง และตรวจสอบว่าไฟล์เป็นไฟล์สำรอง It’s me ที่สมบูรณ์และไม่ได้ถูกแก้ไข',
'{name} — Diary':'{name} — ไดอารี่',
'Exported {when} · {n} entries':'ส่งออกเมื่อ {when} · {n} บันทึก',
'[{n} video/voice note not included in PDF]':'[ไม่รวมวิดีโอ/บันทึกเสียง {n} รายการไว้ใน PDF]',
'It’s me could not open this browser’s storage, so saved entries may not appear and new ones may not be saved. Turn off private browsing or try another browser.':'It’s me ไม่สามารถเปิดที่เก็บข้อมูลของเบราว์เซอร์นี้ได้ บันทึกที่เก็บไว้อาจไม่แสดง และบันทึกใหม่อาจไม่ถูกบันทึก โปรดปิดโหมดส่วนตัวหรือลองใช้เบราว์เซอร์อื่น',
'Wallpaper':'วอลเปเปอร์','Upload Wallpaper':'อัปโหลดวอลเปเปอร์','Adjust':'ปรับแต่ง','Wallpaper controls':'ตัวควบคุมวอลเปเปอร์',
'Opacity':'ความทึบ','Done':'เสร็จสิ้น',
'Shown behind the Timeline, Create Post and Calendar only.':'แสดงอยู่ด้านหลังไทม์ไลน์ การสร้างโพสต์ และปฏิทินเท่านั้น',
'Apply this wallpaper?':'ใช้วอลเปเปอร์นี้ไหม?',
'It will be saved and shown behind the Timeline, Create Post and Calendar.':'ระบบจะบันทึกและแสดงวอลเปเปอร์ด้านหลังไทม์ไลน์ การสร้างโพสต์ และปฏิทิน',
'Remove this wallpaper?':'ลบวอลเปเปอร์นี้ไหม?',
'The Timeline, Create Post and Calendar will go back to their plain background.':'ไทม์ไลน์ การสร้างโพสต์ และปฏิทินจะกลับไปใช้พื้นหลังเดิม',
'Please choose an image file.':'กรุณาเลือกไฟล์รูปภาพ','That image is too large (max 15 MB).':'รูปภาพมีขนาดใหญ่เกินไป (สูงสุด 15 MB)',
'Could not save the wallpaper.':'ไม่สามารถบันทึกวอลเปเปอร์ได้','That image could not be opened.':'ไม่สามารถเปิดรูปภาพนี้ได้'
};

/* Translate an interface string; unknown strings (and English) pass through unchanged. */
function tr(en,vars){
  let s=(LANG==='th'&&Object.prototype.hasOwnProperty.call(TH,en))?TH[en]:en;
  if(vars)s=s.replace(/\{(\w+)\}/g,(m,k)=>k in vars?vars[k]:m);
  return s;
}

/* ---------- Dates and times ----------
   English keeps the existing format (e.g. "Nov 21, 2026 • 3:05 PM").
   Thai uses Thai month / weekday names and a 24-hour HH:mm clock ("21 พ.ย. 2026 • 15:05").
   Thai dates keep the Gregorian year; change 'th-TH-u-ca-gregory' to 'th-TH' to show Buddhist Era years instead. */
const dLoc=()=>LANG==='th'?'th-TH-u-ca-gregory':'en-US';
const pad2=n=>String(n).padStart(2,'0');
const fmtTime=d=>LANG==='th'?pad2(d.getHours())+':'+pad2(d.getMinutes()):d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const fmtDate=(d,o)=>d.toLocaleDateString(dLoc(),o);
const weekInitials=()=>LANG==='th'?['อา','จ','อ','พ','พฤ','ศ','ส']:['S','M','T','W','T','F','S'];

/* ---------- Static markup ----------
   data-i18n="English text"     → element text is translated
   data-ta="aria-label,title"     → those attributes are translated (the English original is remembered on first run) */
function applyStaticI18n(){
  document.documentElement.lang=LANG==='th'?'th':'en';
  document.title=tr('It’s me – Private Diary');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tr(el.dataset.i18n)});
  document.querySelectorAll('[data-ta]').forEach(el=>{
    el.dataset.ta.split(',').forEach(a=>{
      const k='en'+a.replace(/(^|-)(\w)/g,(m,x,c)=>c.toUpperCase());
      if(el.dataset[k]===undefined)el.dataset[k]=el.getAttribute(a)||'';
      el.setAttribute(a,tr(el.dataset[k]));
    });
  });
}
document.documentElement.lang=LANG==='th'?'th':'en';
