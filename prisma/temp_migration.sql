��g e n e r a t o r   c l i e n t   {  
     p r o v i d e r   =   " p r i s m a - c l i e n t - j s "  
 }  
  
 d a t a s o u r c e   d b   {  
     p r o v i d e r           =   " p o s t g r e s q l "  
     u r l                     =   e n v ( " D A T A B A S E _ U R L " )  
     r e l a t i o n M o d e   =   " p r i s m a "  
 }  
  
 m o d e l   S e l l e r   {  
     i d                         S t r i n g                   @ i d   @ d e f a u l t ( u u i d ( ) )  
     p h o n e                   S t r i n g                   @ u n i q u e  
     p a s s w o r d             S t r i n g ?  
     s h o p N a m e             S t r i n g ?  
     o w n e r N a m e           S t r i n g ?  
     a d d r e s s               S t r i n g ?  
     c i t y                     S t r i n g ?  
     s t a t e                   S t r i n g ?  
     p i n c o d e               S t r i n g ?  
     o p e n T i m e             S t r i n g ?  
     c l o s e T i m e           S t r i n g ?  
     c a t e g o r i e s         S t r i n g [ ]               @ d e f a u l t ( [ ] )  
     c r e a t e d A t           D a t e T i m e               @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t           D a t e T i m e               @ u p d a t e d A t  
     l a t i t u d e             F l o a t ?  
     l o n g i t u d e           F l o a t ?  
     p r o d u c t s             P r o d u c t [ ]  
     r e f r e s h T o k e n s   R e f r e s h T o k e n [ ]  
     i s V i s i b l e           B o o l e a n                 @ d e f a u l t ( t r u e )  
 }  
  
 m o d e l   S u p e r A d m i n   {  
     i d                     S t r i n g                             @ i d   @ d e f a u l t ( u u i d ( ) )  
     e m a i l               S t r i n g                             @ u n i q u e  
     p a s s w o r d         S t r i n g  
     n a m e                 S t r i n g ?  
     c r e a t e d A t       D a t e T i m e                         @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t       D a t e T i m e                         @ u p d a t e d A t  
     a d m i n T o k e n s   A d m i n R e f r e s h T o k e n [ ]  
 }  
  
 m o d e l   A d m i n R e f r e s h T o k e n   {  
     i d                   S t r i n g           @ i d   @ d e f a u l t ( u u i d ( ) )  
     t o k e n             S t r i n g           @ u n i q u e  
     a d m i n I d         S t r i n g  
     e x p i r e s A t     D a t e T i m e  
     c r e a t e d A t     D a t e T i m e       @ d e f a u l t ( n o w ( ) )  
     s u p e r A d m i n   S u p e r A d m i n   @ r e l a t i o n ( f i e l d s :   [ a d m i n I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
 }  
  
 m o d e l   R e f r e s h T o k e n   {  
     i d                 S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     t o k e n           S t r i n g       @ u n i q u e  
     s e l l e r I d     S t r i n g  
     e x p i r e s A t   D a t e T i m e  
     c r e a t e d A t   D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     s e l l e r         S e l l e r       @ r e l a t i o n ( f i e l d s :   [ s e l l e r I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
 }  
  
 m o d e l   P r o d u c t   {  
     i d                           S t r i n g                       @ i d   @ d e f a u l t ( u u i d ( ) )  
     n a m e                       S t r i n g  
     d e s c r i p t i o n         S t r i n g ?  
     m r p P r i c e               F l o a t  
     s e l l i n g P r i c e       F l o a t  
     i m a g e s                   S t r i n g [ ]                   @ d e f a u l t ( [ ] )  
     c a t e g o r y               S t r i n g ?  
     s u b c a t e g o r y         S t r i n g ?  
     s i z e Q u a n t i t i e s   J s o n  
     i s A c t i v e               B o o l e a n                     @ d e f a u l t ( t r u e )  
     c r e a t e d A t             D a t e T i m e                   @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t             D a t e T i m e                   @ u p d a t e d A t  
     s e l l e r I d               S t r i n g  
     s e l l e r                   S e l l e r                       @ r e l a t i o n ( f i e l d s :   [ s e l l e r I d ] ,   r e f e r e n c e s :   [ i d ] )  
     c o l o r I n v e n t o r y   C o l o r I n v e n t o r y [ ]  
 }  
  
 m o d e l   C o l o r I n v e n t o r y   {  
     i d                 S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     p r o d u c t I d   S t r i n g  
     c o l o r           S t r i n g  
     i n v e n t o r y   J s o n  
     c r e a t e d A t   D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t   D a t e T i m e   @ u p d a t e d A t  
     c o l o r C o d e   S t r i n g       @ d e f a u l t ( " " )  
     p r o d u c t       P r o d u c t     @ r e l a t i o n ( f i e l d s :   [ p r o d u c t I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
  
     @ @ u n i q u e ( [ p r o d u c t I d ,   c o l o r ] )  
 }  
  
 m o d e l   U s e r   {  
     i d                                   S t r i n g                               @ i d   @ d e f a u l t ( u u i d ( ) )  
     e m a i l                             S t r i n g                               @ u n i q u e  
     p h o n e                             S t r i n g ?                             @ u n i q u e  
     p a s s w o r d                       S t r i n g  
     n a m e                               S t r i n g ?  
     p r o f i l e P i c t u r e           S t r i n g ?  
     i s V e r i f i e d                   B o o l e a n                             @ d e f a u l t ( f a l s e )  
     v e r i f i c a t i o n T o k e n     S t r i n g ?  
     p a s s w o r d R e s e t T o k e n   S t r i n g ?  
     r e s e t T o k e n E x p i r y       D a t e T i m e ?  
     c r e a t e d A t                     D a t e T i m e                           @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t                     D a t e T i m e                           @ u p d a t e d A t  
     i s P h o n e V e r i f i e d         B o o l e a n                             @ d e f a u l t ( f a l s e )  
     l a s t L o g i n A t                 D a t e T i m e ?  
     r o l e                               U s e r R o l e                           @ d e f a u l t ( U S E R )  
     t o k e n V e r s i o n               I n t                                     @ d e f a u l t ( 0 )  
     a d d r e s s e s                     A d d r e s s [ ]  
     o r d e r s                           O r d e r [ ]  
     c a r t s                             C a r t [ ]  
     r e f r e s h T o k e n s             U s e r R e f r e s h T o k e n [ ]  
     p a y m e n t s                       P a y m e n t T r a n s a c t i o n [ ]  
 }  
  
 m o d e l   U s e r R e f r e s h T o k e n   {  
     i d                 S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     t o k e n           S t r i n g       @ u n i q u e  
     u s e r I d         S t r i n g  
     e x p i r e s A t   D a t e T i m e  
     c r e a t e d A t   D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     u s e r             U s e r           @ r e l a t i o n ( f i e l d s :   [ u s e r I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
 }  
  
 m o d e l   A d d r e s s   {  
     i d                 S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     u s e r I d         S t r i n g  
     n a m e             S t r i n g  
     p h o n e           S t r i n g  
     l i n e 1           S t r i n g  
     l i n e 2           S t r i n g ?  
     c i t y             S t r i n g  
     s t a t e           S t r i n g  
     p i n c o d e       S t r i n g  
     c o u n t r y       S t r i n g       @ d e f a u l t ( " I n d i a " )  
     i s D e f a u l t   B o o l e a n     @ d e f a u l t ( f a l s e )  
     l a t i t u d e     F l o a t ?  
     l o n g i t u d e   F l o a t ?  
     c r e a t e d A t   D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t   D a t e T i m e   @ u p d a t e d A t  
     u s e r             U s e r           @ r e l a t i o n ( f i e l d s :   [ u s e r I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
     o r d e r s         O r d e r [ ]  
 }  
  
 m o d e l   C a r t   {  
     i d                 S t r i n g           @ i d   @ d e f a u l t ( u u i d ( ) )  
     u s e r I d         S t r i n g  
     c r e a t e d A t   D a t e T i m e       @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t   D a t e T i m e       @ u p d a t e d A t  
     u s e r             U s e r               @ r e l a t i o n ( f i e l d s :   [ u s e r I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
     i t e m s           C a r t I t e m [ ]  
 }  
  
 m o d e l   C a r t I t e m   {  
     i d                 S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     c a r t I d         S t r i n g  
     p r o d u c t I d   S t r i n g  
     q u a n t i t y     I n t             @ d e f a u l t ( 1 )  
     s i z e             S t r i n g  
     c o l o r           S t r i n g ?  
     p r i c e           F l o a t  
     c r e a t e d A t   D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t   D a t e T i m e   @ u p d a t e d A t  
     c a r t             C a r t           @ r e l a t i o n ( f i e l d s :   [ c a r t I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
 }  
  
 m o d e l   O r d e r   {  
     i d                                 S t r i n g                               @ i d   @ d e f a u l t ( u u i d ( ) )  
     o r d e r N u m b e r               S t r i n g                               @ u n i q u e  
     u s e r I d                         S t r i n g  
     t o t a l A m o u n t               F l o a t  
     s t a t u s                         O r d e r S t a t u s                     @ d e f a u l t ( P E N D I N G )  
     p a y m e n t S t a t u s           P a y m e n t S t a t u s                 @ d e f a u l t ( P E N D I N G )  
     p a y m e n t M e t h o d           P a y m e n t M e t h o d                 @ d e f a u l t ( C O D )  
     a d d r e s s I d                   S t r i n g ?  
     d i s c o u n t                     F l o a t                                 @ d e f a u l t ( 0 )  
     s h i p p i n g F e e               F l o a t                                 @ d e f a u l t ( 0 )  
     t a x                               F l o a t                                 @ d e f a u l t ( 0 )  
     n o t e s                           S t r i n g ?  
     d e l i v e r y N o t e s           S t r i n g ?  
     e s t i m a t e d D e l i v e r y   D a t e T i m e ?  
     t r a c k i n g N u m b e r         S t r i n g ?  
     d e l i v e r e d A t               D a t e T i m e ?  
     c a n c e l l e d A t               D a t e T i m e ?  
     c r e a t e d A t                   D a t e T i m e                           @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t                   D a t e T i m e                           @ u p d a t e d A t  
     u s e r                             U s e r                                   @ r e l a t i o n ( f i e l d s :   [ u s e r I d ] ,   r e f e r e n c e s :   [ i d ] )  
     i t e m s                           O r d e r I t e m [ ]  
     s h i p p i n g A d d r e s s       A d d r e s s ?                           @ r e l a t i o n ( f i e l d s :   [ a d d r e s s I d ] ,   r e f e r e n c e s :   [ i d ] )  
     t r a n s a c t i o n s             P a y m e n t T r a n s a c t i o n [ ]  
 }  
  
 m o d e l   O r d e r I t e m   {  
     i d                     S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     o r d e r I d           S t r i n g  
     p r o d u c t I d       S t r i n g  
     p r o d u c t N a m e   S t r i n g  
     s e l l e r I d         S t r i n g  
     q u a n t i t y         I n t  
     s i z e                 S t r i n g  
     c o l o r               S t r i n g ?  
     p r i c e               F l o a t  
     d i s c o u n t         F l o a t         @ d e f a u l t ( 0 )  
     c r e a t e d A t       D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t       D a t e T i m e   @ u p d a t e d A t  
     o r d e r               O r d e r         @ r e l a t i o n ( f i e l d s :   [ o r d e r I d ] ,   r e f e r e n c e s :   [ i d ] ,   o n D e l e t e :   C a s c a d e )  
 }  
  
 m o d e l   P a y m e n t T r a n s a c t i o n   {  
     i d                                 S t r i n g                 @ i d   @ d e f a u l t ( u u i d ( ) )  
     u s e r I d                         S t r i n g  
     o r d e r I d                       S t r i n g ?  
     a m o u n t                         F l o a t  
     c u r r e n c y                     S t r i n g                 @ d e f a u l t ( " I N R " )  
     s t a t u s                         P a y m e n t S t a t u s  
     p a y m e n t M e t h o d           P a y m e n t M e t h o d  
     t r a n s a c t i o n I d           S t r i n g ?               @ u n i q u e  
     g a t e w a y R e s p o n s e       J s o n ?  
     p a y m e n t L i n k               S t r i n g ?  
     p a y m e n t L i n k E x p i r y   D a t e T i m e ?  
     c r e a t e d A t                   D a t e T i m e             @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t                   D a t e T i m e             @ u p d a t e d A t  
     u s e r                             U s e r                     @ r e l a t i o n ( f i e l d s :   [ u s e r I d ] ,   r e f e r e n c e s :   [ i d ] )  
     o r d e r                           O r d e r ?                 @ r e l a t i o n ( f i e l d s :   [ o r d e r I d ] ,   r e f e r e n c e s :   [ i d ] )  
 }  
  
 m o d e l   W h a t s A p p O T P   {  
     i d                     S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     p h o n e N u m b e r   S t r i n g  
     o t p C o d e           S t r i n g  
     v e r i f i e d         B o o l e a n     @ d e f a u l t ( f a l s e )  
     e x p i r e s A t       D a t e T i m e  
     c r e a t e d A t       D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     u p d a t e d A t       D a t e T i m e   @ u p d a t e d A t  
     n a m e                 S t r i n g ?  
     e m a i l               S t r i n g ?  
     i s N e w U s e r       B o o l e a n ?   @ d e f a u l t ( f a l s e )  
  
     @ @ i n d e x ( [ p h o n e N u m b e r ,   e x p i r e s A t ] )  
 }  
  
 m o d e l   O T P   {  
     i d                     S t r i n g       @ i d   @ d e f a u l t ( u u i d ( ) )  
     p h o n e N u m b e r   S t r i n g  
     o t p C o d e           S t r i n g  
     c r e a t e d A t       D a t e T i m e   @ d e f a u l t ( n o w ( ) )  
     e x p i r e s A t       D a t e T i m e  
     v e r i f i e d         B o o l e a n     @ d e f a u l t ( f a l s e )  
  
     @ @ i n d e x ( [ p h o n e N u m b e r ] )  
 }  
  
 e n u m   P r o d u c t C a t e g o r y   {  
     M E N  
     W O M E N  
     K I D S  
 }  
  
 e n u m   O r d e r S t a t u s   {  
     P E N D I N G  
     C O N F I R M E D  
     S H I P P E D  
     D E L I V E R E D  
     C A N C E L L E D  
     R E T U R N E D  
 }  
  
 e n u m   P a y m e n t S t a t u s   {  
     P E N D I N G  
     S U C C E S S F U L  
     F A I L E D  
     R E F U N D E D  
 }  
  
 e n u m   P a y m e n t M e t h o d   {  
     C O D  
     C R E D I T _ C A R D  
     D E B I T _ C A R D  
     U P I  
     W A L L E T  
     N E T _ B A N K I N G  
 }  
  
 e n u m   U s e r R o l e   {  
     U S E R  
     A D M I N  
     M O D E R A T O R  
 }  
  
 - -   M i g r a t i o n :   A d d   i s V i s i b l e   f i e l d   t o   S e l l e r   m o d e l  
 - -   C r e a t e d :   2 0 2 3 - X X - X X  
 A L T E R   T A B L E   " S e l l e r "   A D D   C O L U M N   " i s V i s i b l e "   B O O L E A N   N O T   N U L L   D E F A U L T   T R U E ;  
  
 - -   M i g r a t i o n :   E n s u r e   p r o d u c t s   r e s p e c t   s e l l e r   v i s i b i l i t y  
 - -   C r e a t e   a   v i e w   f o r   p u b l i c   p r o d u c t s   t h a t   a u t o m a t i c a l l y   f i l t e r s   b y   s e l l e r   v i s i b i l i t y  
 C R E A T E   O R   R E P L A C E   V I E W   " P u b l i c P r o d u c t s "   A S  
 S E L E C T   p . *   F R O M   " P r o d u c t "   p  
 J O I N   " S e l l e r "   s   O N   p . " s e l l e r I d "   =   s . i d  
 W H E R E   p . " i s A c t i v e "   =   T R U E   A N D   s . " i s V i s i b l e "   =   T R U E ;  
  
 - -   A d d   i n d e x   t o   i m p r o v e   p e r f o r m a n c e   o f   s e l l e r   v i s i b i l i t y   f i l t e r i n g  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   " i d x _ s e l l e r _ v i s i b i l i t y "   O N   " S e l l e r " ( " i s V i s i b l e " ) ;  
  
 - -   A d d   i n d e x   f o r   p r o d u c t   a c t i v e   s t a t u s   a n d   s e l l e r   I D   f o r   f a s t e r   f i l t e r i n g  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   " i d x _ p r o d u c t _ a c t i v e _ s e l l e r "   O N   " P r o d u c t " ( " i s A c t i v e " ,   " s e l l e r I d " ) ;  
  
  
 