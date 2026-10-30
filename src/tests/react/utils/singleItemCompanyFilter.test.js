import React from 'react';
import renderer,{act} from 'react-test-renderer';
import CompanyFilter from '../../../react/components/CompanyFilter';
const mockSelect=jest.fn(), mockA={id:1,alias:'Empresa completa'},mockB={id:2,alias:'Outra'};
let mockCompanies=[mockA,mockB];
jest.mock('@store',()=>({useStore:name=>({getters:name==='people'?{currentCompany:mockA,companies:mockCompanies}:name==='auth'?{user:{name:'Teste'}}:{colors:{}},actions:{setCurrentCompany:mockSelect}})}));
jest.mock('react-native',()=>({View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',Modal:'Modal',ScrollView:'ScrollView',Animated:{View:'AnimatedView',Value:function(){},parallel:()=>({start:cb=>cb?.()}),timing:()=>({})}}));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({bottom:0})}));
jest.mock('react-native-vector-icons/Feather',()=> 'Icon');
jest.mock('react-native-vector-icons/FontAwesome',()=> 'Icon');
jest.mock('@controleonline/../../src/components/HomeIcon',()=> 'Icon');
jest.mock('@controleonline/../../src/components/HomeAvatar',()=> 'Avatar');
jest.mock('@controleonline/../../src/components/resolveHomeAvatarUrl',()=>()=> '');
jest.mock('@controleonline/ui-common/src/react/components/UserAvatar',()=> 'Avatar');
jest.mock('@controleonline/ui-common/src/react/utils/fileUrl',()=>({resolveFileImageUrl:()=>''}));
jest.mock('@controleonline/ui-common/src/react/utils/userAvatar',()=>({getAvatarDisplayName:()=> 'Teste',resolveUserAvatarUrl:()=>''}));
jest.mock('@controleonline/ui-people/src/react/utils/peopleImage',()=>({resolvePeopleDisplayName:p=>p.alias,resolvePeopleImageUrl:()=>''}));
jest.mock('@controleonline/ui-layout/src/styles/branding',()=>({resolveThemePalette:v=>v}));
jest.mock('@controleonline/ui-layout/src/styles/colors',()=>({colors:{}}));
jest.mock('@controleonline/../../src/styles/homepagePalette',()=>({resolveHomepagePalette:v=>v}));
jest.mock('../../../react/components/CompanyFilter.styles',()=>({__esModule:true,default:()=>({}),inlineStyle_275_20:{}}));
let tree;beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;mockSelect.mockClear();mockCompanies=[mockA,mockB];});afterEach(()=>act(()=>tree?.unmount()));
it('delegates selection without changing store or current label before confirmation',()=>{
 const confirm=jest.fn();act(()=>{tree=renderer.create(<CompanyFilter mode="icon" wrapLabel onSelectCompany={confirm}/>);});
 act(()=>tree.root.findByProps({testID:'company-selector-item-2'}).props.onPress());
 expect(confirm).toHaveBeenCalledWith(mockB);expect(mockSelect).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('Text').some(n=>n.props.children==='Empresa completa'&&n.props.numberOfLines===undefined)).toBe(true);
});
it('blocks unavailable company and disabled control even when a stale callback fires',()=>{
 mockCompanies=[mockA,{...mockB,enabled:false}];act(()=>{tree=renderer.create(<CompanyFilter mode="icon"/>);});
 act(()=>tree.root.findByProps({testID:'company-selector-item-2'}).props.onPress());expect(mockSelect).not.toHaveBeenCalled();
 act(()=>tree.update(<CompanyFilter mode="icon" disabled/>));
 act(()=>tree.root.findByProps({testID:'company-selector-item-1'}).props.onPress());expect(mockSelect).not.toHaveBeenCalled();
});
it('preserves the existing store action when no adapter callback is supplied',()=>{
 act(()=>{tree=renderer.create(<CompanyFilter mode="icon"/>);});
 act(()=>tree.root.findByProps({testID:'company-selector-item-2'}).props.onPress());expect(mockSelect).toHaveBeenCalledWith(mockB);
});
