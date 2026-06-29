import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { useStore } from '@nanostores/react';
import { navigateBack, currentTestId, editingQuestionId, previousScreen, navigateTo } from '../lib/navigation';
import { 
    getTestWithQuestions,
    addQuestionToTest,
    updateQuestion,
} from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import { uploadFileToHostinger, validateFile } from '../services/uploadService';
import type { ElectronicTest, TestQuestion, QuestionType } from '../types/database.types';
import './AddQuestionScreen.css';

export function AddQuestionScreen() {
    const testId = useStore(currentTestId);
    const questionId = useStore(editingQuestionId);
    const [test, setTest] = useState<ElectronicTest | null>(null);
    const [question, setQuestion] = useState<TestQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [questionText, setQuestionText] = useState('');
    const [questionType, setQuestionType] = useState<QuestionType>('true_false');
    const [points, setPoints] = useState(1);
    const [options, setOptions] = useState<string[]>(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [vocabularyWords, setVocabularyWords] = useState<Array<{ word: string; imageUrl: string }>>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [imageUploadProgress, setImageUploadProgress] = useState<Record<number, number>>({});
    const [currentWordInput, setCurrentWordInput] = useState('');
    
    // For question image (توضيحية - يمكن أن تكون مع النص)
    const [questionImageUrl, setQuestionImageUrl] = useState<string>('');
    const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
    const [questionImageProgress, setQuestionImageProgress] = useState(0);
    
    // For odd_word type
    const [oddWords, setOddWords] = useState<string[]>(['', '', '', '']);
    const [oddWordCorrectIndex, setOddWordCorrectIndex] = useState<number>(0);
    
    // For matching type
    const [matchingPairs, setMatchingPairs] = useState<Array<{ word: string; matchKey: string; options: Array<{ key: string; value: string }> }>>([]);
    
    // For fill_from_box type
    const [boxWords, setBoxWords] = useState<string[]>(['', '', '']);
    const [fillSentences, setFillSentences] = useState<string[]>(['', '', '']);
    
    // For do_as_shown type
    const [doAsShownItems, setDoAsShownItems] = useState<Array<{ sentence: string; instruction: string; answer: string }>>([]);
    
    // For use_a_or_an type
    const [useAOrAnWords, setUseAOrAnWords] = useState<string[]>(['', '']);
    
    // For reading_comprehension type
    const [paragraphText, setParagraphText] = useState('');
    const [subQuestions, setSubQuestions] = useState<Array<{
        question: string;
        type: 'multiple_choice' | 'true_false' | 'fill_in_blank';
        options?: string[];
        correctAnswer: string | number;
    }>>([]);
    
    // Math symbols quick insert
    const [showMathButtons, setShowMathButtons] = useState(false);

    useEffect(() => {
        loadTestAndQuestion();
    }, [testId, questionId]);

    // Render MathJax when question text changes
    useEffect(() => {
        if (window.MathJax && questionText) {
            // Wait for MathJax to be ready, then typeset
            if (window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise().then(() => {
                    // Force RTL direction after typesetting with multiple attempts
                    const forceRTL = () => {
                        const containers = document.querySelectorAll('mjx-container');
                        containers.forEach((container: any) => {
                            container.style.direction = 'rtl';
                            container.style.textAlign = 'right';
                            container.setAttribute('dir', 'rtl');
                            
                            const mtexts = container.querySelectorAll('mjx-mtext');
                            mtexts.forEach((mtext: any) => {
                                mtext.style.direction = 'rtl';
                                mtext.style.textAlign = 'right';
                                mtext.style.unicodeBidi = 'bidi-override';
                                mtext.setAttribute('dir', 'rtl');
                                
                                // Also fix spans inside mtext - reverse text direction
                                const spans = mtext.querySelectorAll('span');
                                spans.forEach((span: any) => {
                                    const text = span.textContent || span.innerText;
                                    if (text && /[\u0600-\u06FF]/.test(text)) {
                                        // Contains Arabic characters
                                        span.style.direction = 'rtl';
                                        span.style.unicodeBidi = 'bidi-override';
                                        span.setAttribute('dir', 'rtl');
                                    }
                                });
                                
                                // Fix Arabic text by reversing character order
                                const walker = document.createTreeWalker(
                                    mtext,
                                    NodeFilter.SHOW_TEXT,
                                    null
                                );
                                let textNode;
                                while (textNode = walker.nextNode()) {
                                    const text = textNode.textContent || '';
                                    if (text && /[\u0600-\u06FF]/.test(text)) {
                                        // Contains Arabic - reverse the characters
                                        textNode.textContent = text.split('').reverse().join('');
                                    }
                                }
                            });
                        });
                    };
                    
                    // Apply immediately and after delays
                    forceRTL();
                    setTimeout(forceRTL, 50);
                    setTimeout(forceRTL, 200);
                    setTimeout(forceRTL, 500);
                }).catch((err: any) => {
                    console.error('MathJax typeset error:', err);
                });
            }
        }
    }, [questionText]);

    // Insert math symbol at cursor position
    const insertMathSymbol = (symbol: string) => {
        // Use ref to get textarea element
        const textarea = document.querySelector('textarea.form-textarea') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const text = questionText;
            const newText = text.substring(0, start) + symbol + text.substring(end);
            setQuestionText(newText);
            
            // Set cursor position after inserted symbol
            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + symbol.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 10);
        } else {
            // Fallback: append to end
            setQuestionText(questionText + symbol);
        }
    };

    // Math templates
    const mathTemplates = [
        { name: 'كسر بسيط', template: '$\\frac{1}{2}$' },
        { name: 'كسر مع متغيرات', template: '$\\frac{a}{b}$' },
        { name: 'التغير المئوي', template: '$\\text{التغير المئوي} = \\frac{\\text{مقدار التغير}}{\\text{الكمية الأصلية}}$' },
        { name: 'جذر تربيعي', template: '$\\sqrt{16}$' },
        { name: 'جذر تكعيبي', template: '$\\sqrt[3]{8}$' },
        { name: 'أس بسيط', template: '$x^2$' },
        { name: 'معادلة خطية', template: '$x + 5 = 10$' },
        { name: 'معادلة تربيعية', template: '$ax^2 + bx + c = 0$' },
        { name: 'نسبة', template: '$\\frac{a}{b} = \\frac{c}{d}$' },
    ];

    const loadTestAndQuestion = async () => {
        if (!testId) {
            setMessage({ type: 'error', text: 'لم يتم تحديد اختبار' });
            setLoading(false);
            return;
        }

        setLoading(true);
        const testData = await getTestWithQuestions(testId);
        
        if (testData) {
            setTest(testData.test);
            
            if (questionId) {
                // Load question for editing
                const foundQuestion = testData.questions.find(q => q.id === questionId);
                if (foundQuestion) {
                    setQuestion(foundQuestion);
                    
                    // Load question text
                    setQuestionText(foundQuestion.question_text || '');
                    
                    // Load question image (if exists)
                    if (foundQuestion.question_image) {
                        setQuestionImageUrl(foundQuestion.question_image);
                    } else {
                        // Backward compatibility: check if question_text is an image URL
                        const isImageUrl = foundQuestion.question_text.startsWith('http://') || 
                                         foundQuestion.question_text.startsWith('https://') ||
                                         foundQuestion.question_text.startsWith('uploads/');
                        if (isImageUrl) {
                            setQuestionImageUrl(foundQuestion.question_text);
                            setQuestionText('');
                        } else {
                            setQuestionImageUrl('');
                        }
                    }
                    
                    setQuestionType(foundQuestion.question_type);
                    setPoints(foundQuestion.points);
                    
                    // Load options for multiple_choice questions
                    if (foundQuestion.question_type === 'multiple_choice') {
                        if (foundQuestion.options && Array.isArray(foundQuestion.options)) {
                            // Options is already an array
                            setOptions(foundQuestion.options.map(opt => typeof opt === 'string' ? opt : opt.text));
                        } else if (foundQuestion.options && typeof foundQuestion.options === 'object' && !Array.isArray(foundQuestion.options)) {
                            // Legacy format: options wrapped in object with 'options' property
                            const optionsObj = foundQuestion.options as any;
                            if (optionsObj.options && Array.isArray(optionsObj.options)) {
                                setOptions(optionsObj.options.map((opt: any) => typeof opt === 'string' ? opt : opt.text));
                            } else {
                                setOptions(['', '', '', '']);
                            }
                        } else {
                            setOptions(['', '', '', '']);
                        }
                    } else {
                        setOptions(['', '', '', '']);
                    }
                    
                    setCorrectAnswer(foundQuestion.correct_answer || '');
                    
                    // Load question-specific data based on type
                    if (foundQuestion.options) {
                        const optionsData: any = typeof foundQuestion.options === 'object' && !Array.isArray(foundQuestion.options)
                            ? foundQuestion.options
                            : null;
                            
                        if (foundQuestion.question_type === 'vocabulary' && optionsData) {
                            if (optionsData.words && Array.isArray(optionsData.words)) {
                                setVocabularyWords(optionsData.words);
                            } else if (optionsData.images && Array.isArray(optionsData.images)) {
                                // Legacy format
                                const images = optionsData.images;
                                const correctAnswers = (foundQuestion.correct_answer || '').split(',');
                                const words = images.map((img: string, idx: number) => ({
                                    word: correctAnswers[idx] || '',
                                    imageUrl: img
                                }));
                                setVocabularyWords(words);
                            }
                        } else if (foundQuestion.question_type === 'odd_word' && optionsData) {
                            if (optionsData.words && Array.isArray(optionsData.words)) {
                                setOddWords(optionsData.words);
                            }
                            if (foundQuestion.correct_answer) {
                                setOddWordCorrectIndex(parseInt(foundQuestion.correct_answer) || 0);
                            }
                        } else if (foundQuestion.question_type === 'matching' && optionsData) {
                            if (optionsData.pairs && Array.isArray(optionsData.pairs)) {
                                setMatchingPairs(optionsData.pairs);
                            }
                        } else if (foundQuestion.question_type === 'fill_from_box' && optionsData) {
                            if (optionsData.words && Array.isArray(optionsData.words)) {
                                setBoxWords(optionsData.words);
                            }
                            if (optionsData.sentences && Array.isArray(optionsData.sentences)) {
                                setFillSentences(optionsData.sentences);
                            }
                        } else if (foundQuestion.question_type === 'do_as_shown' && optionsData) {
                            if (optionsData.items && Array.isArray(optionsData.items)) {
                                setDoAsShownItems(optionsData.items);
                            }
                        } else if (foundQuestion.question_type === 'use_a_or_an' && optionsData) {
                            if (optionsData.words && Array.isArray(optionsData.words)) {
                                setUseAOrAnWords(optionsData.words);
                            }
                        } else if (foundQuestion.question_type === 'reading_comprehension' && optionsData) {
                            if (optionsData.paragraph) {
                                setParagraphText(optionsData.paragraph);
                            }
                            if (optionsData.questions && Array.isArray(optionsData.questions)) {
                                setSubQuestions(optionsData.questions);
                            }
                        }
                    }
                }
            } else {
                // Reset form for new question
                setQuestion(null);
                setQuestionText('');
                setQuestionType('true_false');
                setPoints(1);
                setOptions(['', '', '', '']);
                setCorrectAnswer('');
                setVocabularyWords([]);
                setCurrentWordInput('');
                setOddWords(['', '', '', '']);
                setOddWordCorrectIndex(0);
                setMatchingPairs([]);
                setBoxWords(['', '', '']);
                setFillSentences(['', '', '']);
                setUseAOrAnWords(['', '']);
                setParagraphText('');
                setSubQuestions([]);
                setQuestionImageUrl('');
            }
        } else {
            setMessage({ type: 'error', text: 'فشل تحميل الاختبار' });
        }
        
        setLoading(false);
    };

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleAddWord = () => {
        if (!currentWordInput.trim()) {
            setMessage({ type: 'error', text: 'الرجاء إدخال كلمة' });
            return;
        }
        setVocabularyWords([...vocabularyWords, { word: currentWordInput.trim(), imageUrl: '' }]);
        setCurrentWordInput('');
    };

    const handleImageUploadForWord = async (wordIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImages(true);
        
        // Validate image
        const validation = validateFile(file, 'schedule');
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'خطأ في الملف' });
            setUploadingImages(false);
            return;
        }

        try {
            // Upload image
            const uploadResponse = await uploadFileToHostinger(
                file,
                1,
                'vocabulary',
                'schedule',
                (progress) => {
                    const progressValue = typeof progress === 'number' ? progress : progress.percentage;
                    setImageUploadProgress(prev => ({ ...prev, [wordIndex]: progressValue }));
                }
            );

            if (uploadResponse.success && uploadResponse.fileUrl) {
                const newWords = [...vocabularyWords];
                newWords[wordIndex].imageUrl = uploadResponse.fileUrl;
                setVocabularyWords(newWords);
                setMessage({ type: 'success', text: 'تم رفع الصورة بنجاح' });
            } else {
                setMessage({ type: 'error', text: uploadResponse.error || 'فشل رفع الصورة' });
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setMessage({ type: 'error', text: 'فشل رفع الصورة' });
        }

        setUploadingImages(false);
        setImageUploadProgress({});
        
        // Reset file input
        event.target.value = '';
    };

    const handleRemoveWord = (index: number) => {
        setVocabularyWords(vocabularyWords.filter((_, i) => i !== index));
    };

    const handleQuestionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingQuestionImage(true);
        setQuestionImageProgress(0);
        
        // Validate image
        const validation = validateFile(file, 'schedule');
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'خطأ في الملف' });
            setUploadingQuestionImage(false);
            return;
        }

        try {
            // Upload image
            const uploadResponse = await uploadFileToHostinger(
                file,
                test?.grade || 1,
                test?.subject_name || 'questions',
                'schedule',
                (progress) => {
                    const progressValue = typeof progress === 'number' ? progress : progress.percentage;
                    setQuestionImageProgress(progressValue);
                }
            );

            if (uploadResponse.success && uploadResponse.fileUrl) {
                setQuestionImageUrl(uploadResponse.fileUrl);
                setMessage({ type: 'success', text: 'تم رفع صورة السؤال بنجاح' });
            } else {
                setMessage({ type: 'error', text: uploadResponse.error || 'فشل رفع الصورة' });
            }
        } catch (error) {
            console.error('Error uploading question image:', error);
            setMessage({ type: 'error', text: 'فشل رفع الصورة' });
        }

        setUploadingQuestionImage(false);
        setQuestionImageProgress(0);
        
        // Reset file input
        event.target.value = '';
    };

    const handleWordChange = (index: number, newWord: string) => {
        const newWords = [...vocabularyWords];
        newWords[index].word = newWord;
        setVocabularyWords(newWords);
    };

    const handleSave = async () => {
        // Validate question input - must have either text or image (or both)
        if (!questionText.trim() && !questionImageUrl) {
            setMessage({ type: 'error', text: 'الرجاء إدخال نص السؤال أو رفع صورة السؤال' });
            return;
        }

        if (questionType === 'multiple_choice') {
            const validOptions = options.filter(opt => opt.trim());
            if (validOptions.length < 2) {
                setMessage({ type: 'error', text: 'الرجاء إدخال على الأقل خيارين' });
                return;
            }
            if (!correctAnswer || correctAnswer === '') {
                setMessage({ type: 'error', text: 'الرجاء تحديد الإجابة الصحيحة' });
                return;
            }
        } else if (questionType === 'true_false') {
            if (correctAnswer !== 'true' && correctAnswer !== 'false') {
                setMessage({ type: 'error', text: 'الرجاء تحديد الإجابة الصحيحة' });
                return;
            }
        }

        if (!testId) {
            setMessage({ type: 'error', text: 'لم يتم تحديد اختبار' });
            return;
        }

        setSaving(true);
        setMessage(null);

        // Prepare options for different question types
        let questionOptions: any = undefined;
        let finalCorrectAnswer = correctAnswer;
        
        if (questionType === 'multiple_choice') {
            questionOptions = options.filter(opt => opt.trim());
        } else if (questionType === 'vocabulary') {
            if (vocabularyWords.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إضافة كلمة واحدة على الأقل' });
                setSaving(false);
                return;
            }
            
            // Validate that all words have images
            const wordsWithoutImages = vocabularyWords.filter(w => !w.imageUrl);
            if (wordsWithoutImages.length > 0) {
                setMessage({ type: 'error', text: 'الرجاء رفع صورة لكل كلمة' });
                setSaving(false);
                return;
            }
            
            questionOptions = {
                words: vocabularyWords
            };
            // Set correct answer as comma-separated words
            finalCorrectAnswer = vocabularyWords.map(w => w.word).join(',');
        } else if (questionType === 'odd_word') {
            const validWords = oddWords.filter(w => w.trim());
            if (validWords.length < 3) {
                setMessage({ type: 'error', text: 'الرجاء إدخال على الأقل 3 كلمات' });
                setSaving(false);
                return;
            }
            if (oddWordCorrectIndex < 0 || oddWordCorrectIndex >= validWords.length) {
                setMessage({ type: 'error', text: 'الرجاء تحديد الكلمة الصحيحة' });
                setSaving(false);
                return;
            }
            
            questionOptions = {
                words: validWords,
                correct: oddWordCorrectIndex
            };
            finalCorrectAnswer = oddWordCorrectIndex.toString();
        } else if (questionType === 'matching') {
            if (matchingPairs.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إضافة زوج واحد على الأقل' });
                setSaving(false);
                return;
            }
            
            // Validate all pairs
            for (let i = 0; i < matchingPairs.length; i++) {
                const pair = matchingPairs[i];
                if (!pair.word.trim() || !pair.matchKey.trim()) {
                    setMessage({ type: 'error', text: `الرجاء إكمال الزوج ${i + 1}` });
                    setSaving(false);
                    return;
                }
            }
            
            questionOptions = {
                pairs: matchingPairs
            };
            finalCorrectAnswer = matchingPairs.map(p => p.matchKey).join(',');
        } else if (questionType === 'fill_from_box') {
            const validWords = boxWords.filter(w => w.trim());
            const validSentences = fillSentences.filter(s => s.trim());
            
            if (validWords.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إدخال كلمات في الصندوق' });
                setSaving(false);
                return;
            }
            if (validSentences.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إدخال جمل واحدة على الأقل' });
                setSaving(false);
                return;
            }
            
            questionOptions = {
                words: validWords,
                sentences: validSentences
            };
            // The correct answer will be set based on which word goes in which sentence
            // For now, we'll use the order: first word for first sentence, etc.
            finalCorrectAnswer = validWords.slice(0, validSentences.length).join(',');
        } else if (questionType === 'do_as_shown') {
            if (doAsShownItems.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إضافة عنصر واحد على الأقل' });
                setSaving(false);
                return;
            }
            
            // Validate all items
            for (let i = 0; i < doAsShownItems.length; i++) {
                const item = doAsShownItems[i];
                if (!item.sentence.trim() || !item.instruction.trim() || !item.answer.trim()) {
                    setMessage({ type: 'error', text: `الرجاء إكمال العنصر ${i + 1}` });
                    setSaving(false);
                    return;
                }
            }
            
            questionOptions = {
                items: doAsShownItems
            };
            finalCorrectAnswer = doAsShownItems.map(item => item.answer).join(',');
        } else if (questionType === 'reading_comprehension') {
            if (!paragraphText.trim()) {
                setMessage({ type: 'error', text: 'الرجاء إدخال نص القطعة' });
                setSaving(false);
                return;
            }
            if (subQuestions.length === 0) {
                setMessage({ type: 'error', text: 'الرجاء إضافة سؤال واحد على الأقل' });
                setSaving(false);
                return;
            }
            
            // Validate all sub-questions
            for (let i = 0; i < subQuestions.length; i++) {
                const subQ = subQuestions[i];
                if (!subQ.question.trim()) {
                    setMessage({ type: 'error', text: `الرجاء إدخال نص السؤال ${i + 1}` });
                    setSaving(false);
                    return;
                }
                if (subQ.type === 'multiple_choice' && (!subQ.options || subQ.options.length < 2)) {
                    setMessage({ type: 'error', text: `الرجاء إضافة على الأقل خيارين للسؤال ${i + 1}` });
                    setSaving(false);
                    return;
                }
                if (subQ.type === 'true_false' && subQ.correctAnswer !== 'true' && subQ.correctAnswer !== 'false') {
                    setMessage({ type: 'error', text: `الرجاء تحديد الإجابة الصحيحة للسؤال ${i + 1}` });
                    setSaving(false);
                    return;
                }
                if (subQ.type === 'fill_in_blank' && !subQ.correctAnswer) {
                    setMessage({ type: 'error', text: `الرجاء إدخال الإجابة الصحيحة للسؤال ${i + 1}` });
                    setSaving(false);
                    return;
                }
            }
            
            questionOptions = {
                paragraph: paragraphText.trim(),
                questions: subQuestions
            };
            // Store all correct answers as comma-separated
            finalCorrectAnswer = subQuestions.map(q => String(q.correctAnswer)).join('|');
        }

        // For reading_comprehension, use paragraph text
        const finalQuestionText = questionType === 'reading_comprehension' 
            ? paragraphText.trim() 
            : questionText.trim();
        
        const questionData: any = {
            question_text: finalQuestionText,
            question_type: questionType,
            points: points,
            options: questionOptions,
            correct_answer: questionType === 'essay' ? undefined : finalCorrectAnswer.trim(),
        };
        
        // Add question_image if exists
        if (questionImageUrl) {
            questionData.question_image = questionImageUrl;
            console.log('Adding question with image:', questionImageUrl);
        } else {
            console.log('No question image provided');
        }
        
        console.log('Question data to save:', {
            question_text: questionData.question_text,
            question_image: questionData.question_image,
            question_type: questionData.question_type
        });

        console.log('Saving question data:', {
            questionType,
            questionOptions,
            vocabularyWords,
            finalCorrectAnswer
        });

        let result;
        if (question && question.id) {
            // Update existing question
            const updateData: Partial<Omit<TestQuestion, 'id' | 'test_id' | 'created_at'>> = {
                question_text: questionData.question_text,
                question_type: questionData.question_type,
                points: questionData.points,
                correct_answer: questionData.correct_answer,
            };
            
            // Add question_image if exists
            if (questionData.question_image) {
                updateData.question_image = questionData.question_image;
            } else {
                // Clear question_image if not provided
                updateData.question_image = undefined;
            }
            
            // Always include options if they exist, regardless of question type
            if (questionData.options !== undefined) {
                if (questionType === 'multiple_choice' && Array.isArray(questionData.options)) {
                    // For multiple_choice, save as array directly (not wrapped in object)
                    updateData.options = questionData.options;
                } else {
                    // For all other types, save options as-is (object or array)
                    updateData.options = questionData.options;
                }
            }
            
            result = await updateQuestion(question.id, updateData);
        } else {
            // Add new question
            result = await addQuestionToTest(
                testId,
                questionData.question_text,
                questionData.question_type,
                questionData.points,
                questionData.options,
                questionData.correct_answer,
                undefined, // questionOrder
                questionData.question_image // questionImage
            );
        }

        setSaving(false);

        if (result.success) {
            setMessage({ type: 'success', text: question ? 'تم تحديث السؤال بنجاح' : 'تم إضافة السؤال بنجاح' });
            
            // إذا أتينا من question-review ونحن نعدل سؤال، نعود تلقائياً بعد الحفظ
            const prevScreen = previousScreen.get();
            if (prevScreen === 'question-review' && question) {
                // انتظر قليلاً لإظهار رسالة النجاح، ثم ارجع
                setTimeout(() => {
                    navigateTo('question-review');
                }, 1000);
                return;
            }
            
            // Reset form for adding another question (only if adding new, not editing)
            if (!question) {
                setQuestionText('');
                setQuestionType('true_false');
                setPoints(1);
                setOptions(['', '', '', '']);
                setCorrectAnswer('');
            }
        } else {
            setMessage({ type: 'error', text: result.error || 'فشل حفظ السؤال' });
        }
    };

    const handleSaveAndBack = async () => {
        await handleSave();
        // Wait a bit for save to complete, then go back
        setTimeout(() => {
            navigateBack();
        }, 500);
    };

    if (loading) {
        return (
            <Layout showFooter={false}>
                <div className="add-question-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1>جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!test) {
        return (
            <Layout showFooter={false}>
                <div className="add-question-screen">
                    <BackButton />
                    <div className="error-container">
                        <p>لم يتم العثور على الاختبار</p>
                        <Button variant="secondary" onClick={navigateBack}>
                            العودة
                        </Button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter={false}>
            <div className="add-question-screen">
                <BackButton />
                
                <div className="test-info-header">
                    <h1 className="screen-title">{question ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h1>
                    <div className="test-info">
                        <h2 className="test-title">{test.test_title}</h2>
                        <p className="test-meta">
                            {test.subject_name} • {getGradeName(test.grade)} • {test.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}
                        </p>
                    </div>
                </div>

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="question-form-container">
                    {/* نص السؤال */}
                    <div className="form-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label className="form-label">نص السؤال (اختياري)</label>
                            <button
                                type="button"
                                onClick={() => setShowMathButtons(!showMathButtons)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: showMathButtons ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
                                    color: showMathButtons ? 'white' : '#3b82f6',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600
                                }}
                            >
                                {showMathButtons ? '✕ إخفاء' : '🔢 رموز رياضية'}
                            </button>
                        </div>
                        
                        {showMathButtons && (
                            <div style={{ 
                                marginBottom: '1rem', 
                                padding: '1rem', 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        قوالب جاهزة (انقر للإدراج):
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }} className="math-templates-grid">
                                        {mathTemplates.map((template, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => insertMathSymbol(template.template)}
                                                style={{
                                                    padding: '0.5rem',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                                }}
                                            >
                                                {template.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        رموز سريعة:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {[
                                            { label: 'كسر', symbol: '$\\frac{}{}$' },
                                            { label: 'جذر', symbol: '$\\sqrt{}$' },
                                            { label: 'أس', symbol: '$^{}$' },
                                            { label: 'نص تحت', symbol: '$_{}$' },
                                            { label: '±', symbol: '$\\pm$' },
                                            { label: '×', symbol: '$\\times$' },
                                            { label: '÷', symbol: '$\\div$' },
                                            { label: '≠', symbol: '$\\neq$' },
                                            { label: '≤', symbol: '$\\leq$' },
                                            { label: '≥', symbol: '$\\geq$' },
                                            { label: 'π', symbol: '$\\pi$' },
                                            { label: '∞', symbol: '$\\infty$' },
                                            { label: '∑', symbol: '$\\sum$' },
                                            { label: '∫', symbol: '$\\int$' },
                                            { label: 'α', symbol: '$\\alpha$' },
                                            { label: 'β', symbol: '$\\beta$' },
                                            { label: 'θ', symbol: '$\\theta$' },
                                        ].map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => insertMathSymbol(item.symbol)}
                                                style={{
                                                    padding: '0.5rem 0.75rem',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    minWidth: '44px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                                }}
                                                title={item.label}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <textarea
                            className="form-textarea"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="اكتب السؤال هنا... (يمكنك استخدام الأزرار أعلاه لإدراج الرموز الرياضية)"
                            rows={4}
                        />
                        {questionText && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>معاينة:</div>
                                <div 
                                    className="tex2jax_process"
                                    style={{ 
                                        fontSize: '1rem',
                                        lineHeight: '1.8',
                                        color: 'var(--text-primary)',
                                        minHeight: '2rem',
                                        fontFamily: 'Cairo, Arial, sans-serif',
                                        direction: 'rtl',
                                        textAlign: 'right'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: questionText }}
                                />
                            </div>
                        )}
                        <div className="form-hint" style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <strong style={{ color: '#10b981' }}>✅ نصيحة:</strong>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                انقر على زر <strong>"رموز رياضية"</strong> أعلاه لإظهار القوالب الجاهزة والرموز السريعة. 
                                يمكنك النقر على أي قالب أو رمز لإدراجه مباشرة في السؤال!
                            </div>
                        </div>
                    </div>

                    {/* صورة السؤال التوضيحية */}
                    <div className="form-section">
                        <label className="form-label">صورة توضيحية للسؤال (اختياري)</label>
                        <div className="form-hint" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                            <strong style={{ color: '#fbbf24' }}>📐 يمكنك إضافة صورة توضيحية مع نص السؤال:</strong>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                يمكنك إضافة صورة توضيحية للسؤال مع النص. مثالي لأسئلة الرياضيات التي تحتوي على:
                                <ul style={{ margin: '0.5rem 0', paddingRight: '1.5rem' }}>
                                    <li>الكسور المعقدة والعمليات الحسابية</li>
                                    <li>الجذور والمعادلات الجبرية</li>
                                    <li>الرسومات البيانية والإحداثيات</li>
                                    <li>النسبة والتناسب</li>
                                    <li>الخطوط والأشكال الهندسية</li>
                                    <li>المساحة والمحيط</li>
                                    <li>الدوال والمعدلات</li>
                                    <li>أي سؤال يحتوي على رسومات أو أشكال</li>
                                </ul>
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.25rem' }}>
                                    💡 نصيحة: يمكنك إنشاء الصورة باستخدام برامج مثل Word, PowerPoint, أو أي محرر نصوص يدعم المعادلات الرياضية
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleQuestionImageUpload}
                                className="form-input"
                                style={{ padding: '0.75rem', cursor: 'pointer' }}
                                disabled={uploadingQuestionImage}
                                id="question-image-upload"
                            />
                            <label 
                                htmlFor="question-image-upload"
                                className="upload-image-label"
                                style={{ 
                                    padding: '0.75rem 1.5rem', 
                                    backgroundColor: '#3b82f6', 
                                    color: 'white', 
                                    borderRadius: '0.5rem', 
                                    cursor: uploadingQuestionImage ? 'not-allowed' : 'pointer',
                                    textAlign: 'center',
                                    opacity: uploadingQuestionImage ? 0.6 : 1
                                }}
                            >
                                {uploadingQuestionImage ? `جاري الرفع... ${questionImageProgress}%` : questionImageUrl ? '✓ تم الرفع - تغيير الصورة' : 'رفع صورة توضيحية'}
                            </label>
                            {uploadingQuestionImage && questionImageProgress > 0 && (
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${questionImageProgress}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s' }}></div>
                                </div>
                            )}
                            {questionImageUrl && (
                                <div className="word-image-preview" style={{ marginTop: '1rem' }}>
                                    <img 
                                        src={questionImageUrl} 
                                        alt="صورة السؤال" 
                                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '0.5rem', border: '2px solid #e2e8f0' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="form-label">نوع السؤال</label>
                        <select
                            className="form-select"
                            value={questionType}
                            onChange={(e) => {
                                setQuestionType(e.target.value as QuestionType);
                                setCorrectAnswer('');
                            }}
                        >
                            <option value="true_false">صح/خطأ</option>
                            <option value="multiple_choice">اختياري</option>
                            <option value="fill_in_blank">إكمال الجملة/تصحيح الخطأ</option>
                            <option value="vocabulary">المفردات (كتابة الكلمات)</option>
                            <option value="odd_word">اختيار الكلمة الغريبة</option>
                            <option value="matching">المطابقة</option>
                            <option value="fill_from_box">إكمال الفراغات من صندوق</option>
                            <option value="do_as_shown">افعل كما هو موضح</option>
                            <option value="use_a_or_an">استخدم a أو an</option>
                            <option value="reading_comprehension">الرجراف (القطعة)</option>
                            <option value="essay">مقالي</option>
                        </select>
                    </div>

                    <div className="form-section">
                        <label className="form-label">النقاط</label>
                        <input
                            type="number"
                            className="form-input"
                            value={points}
                            onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                            min="1"
                        />
                    </div>

                    {questionType === 'multiple_choice' && (
                        <div className="form-section">
                            <label className="form-label">خيارات الإجابة</label>
                            {options.map((option, index) => (
                                <div key={index} className="option-input-group">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`الخيار ${index + 1}`}
                                    />
                                    <div className="option-actions">
                                        <label className="radio-label">
                                            <input
                                                type="radio"
                                                name="correct-answer"
                                                checked={correctAnswer === index.toString()}
                                                onChange={() => setCorrectAnswer(index.toString())}
                                            />
                                            صحيح
                                        </label>
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(index)}
                                                className="remove-option-btn"
                                            >
                                                حذف
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="secondary"
                                onClick={handleAddOption}
                                className="add-option-btn"
                            >
                                إضافة خيار
                            </Button>
                        </div>
                    )}

                    {questionType === 'true_false' && (
                        <div className="form-section">
                            <label className="form-label">الإجابة الصحيحة</label>
                            <div className="true-false-options">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="true-false"
                                        value="true"
                                        checked={correctAnswer === 'true'}
                                        onChange={(e) => setCorrectAnswer(e.target.value)}
                                    />
                                    صح
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="true-false"
                                        value="false"
                                        checked={correctAnswer === 'false'}
                                        onChange={(e) => setCorrectAnswer(e.target.value)}
                                    />
                                    خطأ
                                </label>
                            </div>
                        </div>
                    )}

                    {questionType === 'fill_in_blank' && (
                        <div className="form-section">
                            <label className="form-label">الإجابة الصحيحة</label>
                            <input
                                type="text"
                                className="form-input"
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="أدخل الإجابة الصحيحة..."
                            />
                            <div className="form-hint" style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <strong style={{ color: '#3b82f6' }}>💡 تعليمات:</strong>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <strong>لتصحيح الخطأ:</strong>
                                        <div style={{ marginTop: '0.25rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.25rem' }}>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <strong>في نص السؤال:</strong> ضع الكلمة الخطأ بين قوسين<br/>
                                                مثال: "The English classes are <strong>(in)</strong> Sunday and Monday."
                                            </div>
                                            <div>
                                                <strong>في الإجابة الصحيحة:</strong> اكتب الكلمة الخطأ فقط (بدون القوسين)<br/>
                                                مثال: <strong>in</strong>
                                            </div>
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.25rem', fontSize: '0.8rem' }}>
                                                <strong>سيظهر للطالب:</strong> "The English classes are ... Sunday and Monday."<br/>
                                                <strong>والطالب يكتب:</strong> الكلمة الخطأ فقط
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <strong>لإكمال الجملة:</strong>
                                        <div style={{ marginTop: '0.25rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.25rem' }}>
                                            <div>السؤال: "I am a ...student..."</div>
                                            <div style={{ marginTop: '0.25rem', color: '#22c55e' }}>الإجابة الصحيحة: <strong>student</strong></div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <strong style={{ color: '#10b981' }}>✅ ملاحظة مهمة:</strong> النظام لا يفرق بين الأحرف الكبيرة والصغيرة. "on" = "ON" = "On" = "oN" - كلها صحيحة!
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {questionType === 'vocabulary' && (
                        <div className="form-section">
                            <label className="form-label">إضافة الكلمات والصور</label>
                            
                            {/* Add new word */}
                            <div className="add-word-container">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={currentWordInput}
                                    onChange={(e) => setCurrentWordInput(e.target.value)}
                                    placeholder="أدخل الكلمة (مثال: Family)"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddWord();
                                        }
                                    }}
                                />
                                <Button
                                    variant="secondary"
                                    onClick={handleAddWord}
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    إضافة كلمة
                                </Button>
                            </div>

                            {/* Words list with images */}
                            {vocabularyWords.length > 0 && (
                                <div className="vocabulary-words-list">
                                    {vocabularyWords.map((item, index) => (
                                        <div key={index} className="vocabulary-word-item">
                                            <div className="word-input-group">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={item.word}
                                                    onChange={(e) => handleWordChange(index, e.target.value)}
                                                    placeholder="الكلمة"
                                                />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUploadForWord(index, e)}
                                                    className="form-input"
                                                    style={{ padding: '0.75rem', cursor: 'pointer' }}
                                                    disabled={uploadingImages}
                                                    id={`image-upload-${index}`}
                                                />
                                                <label 
                                                    htmlFor={`image-upload-${index}`}
                                                    className="upload-image-label"
                                                >
                                                    {item.imageUrl ? '✓ تم الرفع' : 'رفع صورة'}
                                                </label>
                                                {item.imageUrl && (
                                                    <div className="word-image-preview">
                                                        <img src={item.imageUrl} alt={item.word} />
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveWord(index)}
                                                    className="remove-word-btn"
                                                >
                                                    حذف
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {uploadingImages && Object.keys(imageUploadProgress).length > 0 && (
                                <div className="upload-progress">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ 
                                                width: `${Object.values(imageUploadProgress)[0]}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <span>جاري رفع الصورة...</span>
                                </div>
                            )}

                            <div className="form-hint" style={{ marginTop: '0.75rem' }}>
                                💡 أدخل الكلمة ثم ارفع صورتها. سيتم عرض الصور للطالب ليكتب الكلمة تحت كل صورة
                            </div>
                        </div>
                    )}

                    {questionType === 'odd_word' && (
                        <div className="form-section">
                            <label className="form-label">الكلمات</label>
                            {oddWords.map((word, index) => (
                                <div key={index} className="option-input-group" style={{ marginBottom: '1rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={word}
                                        onChange={(e) => {
                                            const newWords = [...oddWords];
                                            newWords[index] = e.target.value;
                                            setOddWords(newWords);
                                        }}
                                        placeholder={`كلمة ${index + 1}`}
                                    />
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="odd-word-correct"
                                            checked={oddWordCorrectIndex === index}
                                            onChange={() => setOddWordCorrectIndex(index)}
                                        />
                                        الكلمة الغريبة
                                    </label>
                                </div>
                            ))}
                            <Button
                                variant="secondary"
                                onClick={() => setOddWords([...oddWords, ''])}
                                style={{ marginTop: '0.5rem' }}
                            >
                                إضافة كلمة
                            </Button>
                            <div className="form-hint" style={{ marginTop: '0.75rem' }}>
                                💡 أدخل الكلمات وحدد الكلمة الغريبة/المختلفة
                            </div>
                        </div>
                    )}

                    {questionType === 'matching' && (
                        <div className="form-section">
                            <label className="form-label">أزواج المطابقة</label>
                            {matchingPairs.map((pair, index) => (
                                <div key={index} className="matching-pair-item">
                                    <div className="matching-pair-row">
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={pair.word}
                                            onChange={(e) => {
                                                const newPairs = [...matchingPairs];
                                                newPairs[index].word = e.target.value;
                                                setMatchingPairs(newPairs);
                                            }}
                                            placeholder="الكلمة (مثال: single)"
                                        />
                                        <span style={{ margin: '0 1rem', color: 'rgba(255, 255, 255, 0.7)' }}>→</span>
                                        <select
                                            className="form-select"
                                            value={pair.matchKey}
                                            onChange={(e) => {
                                                const newPairs = [...matchingPairs];
                                                newPairs[index].matchKey = e.target.value;
                                                setMatchingPairs(newPairs);
                                            }}
                                        >
                                            <option value="">اختر...</option>
                                            {pair.options.map((opt, optIdx) => (
                                                <option key={optIdx} value={opt.key}>
                                                    {opt.key} - {opt.value}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="matching-options-row">
                                        <label className="form-label" style={{ fontSize: '0.9rem' }}>خيارات الإجابة:</label>
                                        {pair.options.map((opt, optIdx) => (
                                            <div key={optIdx} className="matching-option-input">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={opt.key}
                                                    onChange={(e) => {
                                                        const newPairs = [...matchingPairs];
                                                        newPairs[index].options[optIdx].key = e.target.value;
                                                        setMatchingPairs(newPairs);
                                                    }}
                                                    placeholder="مفتاح (a, b, c...)"
                                                    style={{ width: '60px' }}
                                                />
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={opt.value}
                                                    onChange={(e) => {
                                                        const newPairs = [...matchingPairs];
                                                        newPairs[index].options[optIdx].value = e.target.value;
                                                        setMatchingPairs(newPairs);
                                                    }}
                                                    placeholder="القيمة"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newPairs = [...matchingPairs];
                                                        newPairs[index].options = newPairs[index].options.filter((_, i) => i !== optIdx);
                                                        setMatchingPairs(newPairs);
                                                    }}
                                                    className="remove-option-btn"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                const newPairs = [...matchingPairs];
                                                newPairs[index].options.push({ key: '', value: '' });
                                                setMatchingPairs(newPairs);
                                            }}
                                            style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
                                        >
                                            إضافة خيار
                                        </Button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== index))}
                                        className="remove-word-btn"
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        حذف الزوج
                                    </button>
                                </div>
                            ))}
                            <Button
                                variant="secondary"
                                onClick={() => setMatchingPairs([...matchingPairs, { word: '', matchKey: '', options: [{ key: 'a', value: '' }, { key: 'b', value: '' }, { key: 'c', value: '' }, { key: 'd', value: '' }] }])}
                                style={{ marginTop: '1rem' }}
                            >
                                إضافة زوج جديد
                            </Button>
                            <div className="form-hint" style={{ marginTop: '0.75rem' }}>
                                💡 أدخل الكلمة والخيارات وحدد الإجابة الصحيحة
                            </div>
                        </div>
                    )}

                    {questionType === 'fill_from_box' && (
                        <div className="form-section">
                            <label className="form-label">الكلمات في الصندوق</label>
                            {boxWords.map((word, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    className="form-input"
                                    value={word}
                                    onChange={(e) => {
                                        const newWords = [...boxWords];
                                        newWords[index] = e.target.value;
                                        setBoxWords(newWords);
                                    }}
                                    placeholder={`كلمة ${index + 1}`}
                                    style={{ marginBottom: '0.75rem' }}
                                />
                            ))}
                            <Button
                                variant="secondary"
                                onClick={() => setBoxWords([...boxWords, ''])}
                                style={{ marginTop: '0.5rem' }}
                            >
                                إضافة كلمة
                            </Button>
                            
                            <label className="form-label" style={{ marginTop: '2rem' }}>الجمل مع الفراغات</label>
                            {fillSentences.map((sentence, index) => (
                                <textarea
                                    key={index}
                                    className="form-textarea"
                                    value={sentence}
                                    onChange={(e) => {
                                        const newSentences = [...fillSentences];
                                        newSentences[index] = e.target.value;
                                        setFillSentences(newSentences);
                                    }}
                                    placeholder={`الجملة ${index + 1} (استخدم ... للفراغ، مثال: "Amal is a new ...student... at our school.")`}
                                    rows={2}
                                    style={{ marginBottom: '0.75rem' }}
                                />
                            ))}
                            <Button
                                variant="secondary"
                                onClick={() => setFillSentences([...fillSentences, ''])}
                                style={{ marginTop: '0.5rem' }}
                            >
                                إضافة جملة
                            </Button>
                            
                            <div className="form-section" style={{ marginTop: '1.5rem' }}>
                                <label className="form-label">ترتيب الإجابات الصحيحة</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={correctAnswer}
                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                    placeholder="أدخل الكلمات بالترتيب الصحيح مفصولة بفواصل (مثال: student,write,cut)"
                                />
                                <div className="form-hint" style={{ marginTop: '0.75rem' }}>
                                    💡 أدخل الكلمات بالترتيب الذي يجب أن تظهر به في الجمل (الكلمة الأولى للجملة الأولى، إلخ)
                                </div>
                            </div>
                        </div>
                    )}

                    {questionType === 'do_as_shown' && (
                        <div className="form-section">
                            <label className="form-label">إضافة العناصر</label>
                            <div className="form-hint" style={{ marginBottom: '1rem' }}>
                                💡 لكل عنصر: الجملة + التعليمات بين القوسين + الإجابة الصحيحة
                            </div>
                            
                            {doAsShownItems.map((item, index) => (
                                <div key={index} className="do-as-shown-item" style={{ 
                                    marginBottom: '1.5rem', 
                                    padding: '1.25rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '2px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>العنصر {index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newItems = doAsShownItems.filter((_, i) => i !== index);
                                                setDoAsShownItems(newItems);
                                            }}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.5rem 1rem',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            حذف
                                        </button>
                                    </div>
                                    
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>الجملة</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={item.sentence}
                                            onChange={(e) => {
                                                const newItems = [...doAsShownItems];
                                                newItems[index].sentence = e.target.value;
                                                setDoAsShownItems(newItems);
                                            }}
                                            placeholder="مثال: This is a car."
                                        />
                                    </div>
                                    
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>التعليمات (بين القوسين)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={item.instruction}
                                            onChange={(e) => {
                                                const newItems = [...doAsShownItems];
                                                newItems[index].instruction = e.target.value;
                                                setDoAsShownItems(newItems);
                                            }}
                                            placeholder="مثال: Change to the plural"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>الإجابة الصحيحة</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={item.answer}
                                            onChange={(e) => {
                                                const newItems = [...doAsShownItems];
                                                newItems[index].answer = e.target.value;
                                                setDoAsShownItems(newItems);
                                            }}
                                            placeholder="مثال: These are cars"
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            <Button
                                variant="secondary"
                                onClick={() => setDoAsShownItems([...doAsShownItems, { sentence: '', instruction: '', answer: '' }])}
                                style={{ marginTop: '0.5rem' }}
                            >
                                إضافة عنصر
                            </Button>
                            
                            <div className="form-hint" style={{ marginTop: '1rem' }}>
                                💡 مثال: الجملة "This is a car." + التعليمات "(Change to the plural)" + الإجابة "These are cars"
                            </div>
                        </div>
                    )}

                    {questionType === 'use_a_or_an' && (
                        <div className="form-section">
                            <label className="form-label">إضافة الكلمات</label>
                            <div className="form-hint" style={{ marginBottom: '1rem' }}>
                                💡 أدخل الكلمات، ثم أدخل الإجابات الصحيحة (a أو an لكل كلمة)
                            </div>
                            
                            {useAOrAnWords.map((word, index) => (
                                <div key={index} style={{ 
                                    marginBottom: '1rem', 
                                    display: 'flex', 
                                    gap: '0.75rem',
                                    alignItems: 'center'
                                }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={word}
                                        onChange={(e) => {
                                            const newWords = [...useAOrAnWords];
                                            newWords[index] = e.target.value;
                                            setUseAOrAnWords(newWords);
                                        }}
                                        placeholder={`الكلمة ${index + 1} (مثال: key)`}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newWords = useAOrAnWords.filter((_, i) => i !== index);
                                            setUseAOrAnWords(newWords);
                                            if (correctAnswer) {
                                                const answers = correctAnswer.split(',');
                                                answers.splice(index, 1);
                                                setCorrectAnswer(answers.join(','));
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        حذف
                                    </button>
                                </div>
                            ))}
                            
                            <Button
                                variant="secondary"
                                onClick={() => setUseAOrAnWords([...useAOrAnWords, ''])}
                                style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}
                            >
                                إضافة كلمة
                            </Button>
                            
                            <div className="form-section">
                                <label className="form-label">الإجابات الصحيحة</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={correctAnswer}
                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                    placeholder="أدخل الإجابات مفصولة بفواصل (مثال: a,a,an,an,a,an)"
                                />
                                <div className="form-hint" style={{ marginTop: '0.75rem' }}>
                                    💡 أدخل "a" أو "an" لكل كلمة بالترتيب (الكلمة الأولى = الإجابة الأولى، إلخ)
                                </div>
                            </div>
                        </div>
                    )}

                    {questionType === 'reading_comprehension' && (
                        <div className="form-section">
                            <label className="form-label">نص القطعة (البراجراف)</label>
                            <textarea
                                className="form-textarea"
                                value={paragraphText}
                                onChange={(e) => setParagraphText(e.target.value)}
                                placeholder="أدخل نص القطعة هنا..."
                                rows={6}
                            />
                            
                            <div className="form-section" style={{ marginTop: '2rem' }}>
                                <label className="form-label">الأسئلة الفرعية</label>
                                {subQuestions.map((subQ, index) => (
                                    <div key={index} style={{
                                        marginBottom: '1.5rem',
                                        padding: '1.25rem',
                                        background: 'rgba(30, 58, 138, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>سؤال {index + 1}</h4>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSubQs = subQuestions.filter((_, i) => i !== index);
                                                    setSubQuestions(newSubQs);
                                                }}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '0.5rem 0.75rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                        
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>نوع السؤال</label>
                                            <select
                                                className="form-select"
                                                value={subQ.type}
                                                onChange={(e) => {
                                                    const newSubQs = [...subQuestions];
                                                    newSubQs[index].type = e.target.value as 'multiple_choice' | 'true_false' | 'fill_in_blank';
                                                    newSubQs[index].options = e.target.value === 'multiple_choice' ? ['', '', '', ''] : undefined;
                                                    newSubQs[index].correctAnswer = '';
                                                    setSubQuestions(newSubQs);
                                                }}
                                            >
                                                <option value="multiple_choice">اختياري</option>
                                                <option value="true_false">صح/خطأ</option>
                                                <option value="fill_in_blank">إكمال الجملة</option>
                                            </select>
                                        </div>
                                        
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>نص السؤال</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={subQ.question}
                                                onChange={(e) => {
                                                    const newSubQs = [...subQuestions];
                                                    newSubQs[index].question = e.target.value;
                                                    setSubQuestions(newSubQs);
                                                }}
                                                placeholder="أدخل نص السؤال..."
                                            />
                                        </div>
                                        
                                        {subQ.type === 'multiple_choice' && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>خيارات الإجابة</label>
                                                {(subQ.options || ['', '', '', '']).map((opt, optIndex) => (
                                                    <div key={optIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newSubQs = [...subQuestions];
                                                                if (!newSubQs[index].options) newSubQs[index].options = ['', '', '', ''];
                                                                newSubQs[index].options![optIndex] = e.target.value;
                                                                setSubQuestions(newSubQs);
                                                            }}
                                                            placeholder={`الخيار ${optIndex + 1}`}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <label className="radio-label" style={{ margin: 0 }}>
                                                            <input
                                                                type="radio"
                                                                name={`subQ${index}-correct`}
                                                                checked={subQ.correctAnswer === optIndex}
                                                                onChange={() => {
                                                                    const newSubQs = [...subQuestions];
                                                                    newSubQs[index].correctAnswer = optIndex;
                                                                    setSubQuestions(newSubQs);
                                                                }}
                                                            />
                                                            <span>صحيح</span>
                                                        </label>
                                                        {(subQ.options || ['', '', '', '']).length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newSubQs = [...subQuestions];
                                                                    if (!newSubQs[index].options) newSubQs[index].options = ['', '', '', ''];
                                                                    const currentOptions = newSubQs[index].options!;
                                                                    const newOptions = currentOptions.filter((_, i) => i !== optIndex);
                                                                    newSubQs[index].options = newOptions;
                                                                    
                                                                    // Update correct answer if needed
                                                                    const currentCorrect = typeof newSubQs[index].correctAnswer === 'number' 
                                                                        ? newSubQs[index].correctAnswer 
                                                                        : parseInt(String(newSubQs[index].correctAnswer)) || 0;
                                                                    if (currentCorrect === optIndex) {
                                                                        // If deleted option was correct, set to first option
                                                                        newSubQs[index].correctAnswer = 0;
                                                                    } else if (currentCorrect > optIndex) {
                                                                        // If correct answer was after deleted option, adjust index
                                                                        newSubQs[index].correctAnswer = currentCorrect - 1;
                                                                    }
                                                                    
                                                                    setSubQuestions(newSubQs);
                                                                }}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                                    color: '#ef4444',
                                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                    borderRadius: '0.375rem',
                                                                    padding: '0.375rem 0.75rem',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: 500,
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                title="حذف الخيار"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSubQs = [...subQuestions];
                                                        if (!newSubQs[index].options) newSubQs[index].options = ['', '', '', ''];
                                                        newSubQs[index].options = [...newSubQs[index].options!, ''];
                                                        setSubQuestions(newSubQs);
                                                    }}
                                                    style={{
                                                        background: 'rgba(59, 130, 246, 0.2)',
                                                        color: '#3b82f6',
                                                        border: '1px solid rgba(59, 130, 246, 0.4)',
                                                        borderRadius: '0.375rem',
                                                        padding: '0.5rem 1rem',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        marginTop: '0.5rem'
                                                    }}
                                                >
                                                    + إضافة خيار
                                                </button>
                                            </div>
                                        )}
                                        
                                        {subQ.type === 'true_false' && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>الإجابة الصحيحة</label>
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <label className="radio-label">
                                                        <input
                                                            type="radio"
                                                            name={`subQ${index}-tf`}
                                                            checked={subQ.correctAnswer === 'true'}
                                                            onChange={() => {
                                                                const newSubQs = [...subQuestions];
                                                                newSubQs[index].correctAnswer = 'true';
                                                                setSubQuestions(newSubQs);
                                                            }}
                                                        />
                                                        <span>صحيح</span>
                                                    </label>
                                                    <label className="radio-label">
                                                        <input
                                                            type="radio"
                                                            name={`subQ${index}-tf`}
                                                            checked={subQ.correctAnswer === 'false'}
                                                            onChange={() => {
                                                                const newSubQs = [...subQuestions];
                                                                newSubQs[index].correctAnswer = 'false';
                                                                setSubQuestions(newSubQs);
                                                            }}
                                                        />
                                                        <span>خطأ</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {subQ.type === 'fill_in_blank' && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label className="form-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>الإجابة الصحيحة</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={String(subQ.correctAnswer || '')}
                                                    onChange={(e) => {
                                                        const newSubQs = [...subQuestions];
                                                        newSubQs[index].correctAnswer = e.target.value;
                                                        setSubQuestions(newSubQs);
                                                    }}
                                                    placeholder="أدخل الإجابة الصحيحة..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                
                                <Button
                                    variant="secondary"
                                    onClick={() => setSubQuestions([...subQuestions, {
                                        question: '',
                                        type: 'multiple_choice',
                                        options: ['', '', '', ''],
                                        correctAnswer: 0
                                    }])}
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    إضافة سؤال فرعي
                                </Button>
                                
                                <div className="form-hint" style={{ marginTop: '1rem' }}>
                                    💡 أدخل نص القطعة ثم أضف الأسئلة الفرعية عليها. يمكنك إضافة أسئلة من نوع اختياري، صح/خطأ، أو إكمال الجملة.
                                </div>
                            </div>
                        </div>
                    )}

                    {questionType === 'essay' && (
                        <div className="form-hint">
                            السؤال المقالي سيتم تقييمه يدوياً من قبل المعلم
                        </div>
                    )}

                    <div className="form-actions">
                        <Button 
                            variant="primary" 
                            onClick={handleSave} 
                            fullWidth
                            disabled={saving}
                        >
                            {saving ? 'جاري الحفظ...' : (question ? 'حفظ التغييرات' : 'حفظ وإضافة آخر')}
                        </Button>
                        {!question && (
                            <Button 
                                variant="secondary" 
                                onClick={handleSaveAndBack} 
                                fullWidth
                                disabled={saving}
                            >
                                حفظ والعودة
                            </Button>
                        )}
                        <Button 
                            variant="secondary" 
                            onClick={navigateBack} 
                            fullWidth
                            disabled={saving}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                color: 'rgba(255, 255, 255, 0.9)'
                            }}
                        >
                            ← رجوع بدون حفظ
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

